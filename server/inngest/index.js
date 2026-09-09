import { Inngest } from "inngest";
import mongoose from "mongoose";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import GroupBooking from "../models/GroupBooking.js";
import { sendEmail } from "../configs/nodeMailer.js";
import {
  GROUP_DECISION_GRACE_MINUTES,
} from "../configs/constants.js";
import { releaseUnpaidGroupSeats } from "../utils/groupBookingRelease.js";
import { reconcileIfActuallyPaid } from "../utils/paymentReconciliation.js";

export const inngest = new Inngest({ id: "movie-ticket-booking" });

// Escape user-supplied strings before embedding in HTML email bodies.
// Prevents stored XSS via email clients (e.g. name = "<script>alert(1)</script>").
const escapeHtml = (str) =>
  String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Chunk array into batches to avoid SMTP rate limit hammering.
const chunk = (arr, size) => {
  const batches = [];
  for (let i = 0; i < arr.length; i += size) {
    batches.push(arr.slice(i, i + size));
  }
  return batches;
};

// Number of emails sent per Inngest step batch.
// Keep low enough to finish within Inngest's step timeout.
const EMAIL_BATCH_SIZE = 50;

// ─── Release seats & delete booking if unpaid after 31 min ────────────────────
// HIGH-06 fix: wait 31 minutes (Stripe session is 31 min — see bookingController).
// Previously waited only 10 min while Stripe allowed 30 min payment window,
// causing: user pays between min 10–30 → charged by Stripe, booking deleted → no ticket.
const releaseSeatsAndDeleteBooking = inngest.createFunction(
  { id: "release-seats-delete-booking" },
  { event: "app/checkpayment" },
  async ({ event, step }) => {
    // HIGH-02 / MED-10 fix: NO outer try/catch.
    // Inngest retries functions that throw. Catching everything and returning
    // { success: false } silently swallows errors — no retry ever fires.
    // Each step has its own internal error handling; let Inngest manage retries.

    const thirtyOneMinsLater = new Date(Date.now() + 31 * 60 * 1000);
    await step.sleepUntil("wait-for-stripe-expiry", thirtyOneMinsLater);

    return await step.run("check-payment-status", async () => {
      const bookingId = event.data.bookingId;
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        console.log("⚠️ Booking already deleted:", bookingId);
        return { success: false, reason: "Booking not found" };
      }

      if (booking.isPaid) {
        console.log("💰 Payment completed, no action needed");
        return { success: true, paid: true };
      }

      const show = await Show.findById(booking.show);
      if (!show) {
        console.log("⚠️ Show not found");
        return { success: false, reason: "Show not found" };
      }

      booking.bookedSeats.forEach((seat) => {
        show.occupiedSeats.delete(seat);
      });

      await show.save();
      await Booking.findByIdAndDelete(booking._id);

      console.log("🗑️ Booking deleted & seats released:", bookingId);
      return { success: true, deleted: true };
    });
  }
);

// ─── Send booking confirmation email ──────────────────────────────────────────
const sendBookingConfirmationEmail = inngest.createFunction(
  { id: "send-booking-confirmation-email" },
  { event: "app/show.booked" },
  // HIGH-02 fix: no outer try/catch — let Inngest retry on failure.
  async ({ event }) => {
    const { bookingId } = event.data;
    console.log("📧 Sending confirmation email for booking:", bookingId);

    const booking = await Booking.findById(bookingId)
      .populate({ path: "show", populate: { path: "movie", model: "Movie" } })
      .populate("user");

    if (!booking || !booking.user?.email) {
      console.log("⚠️ Booking or user email not found");
      return { success: false };
    }

    const userName   = escapeHtml(booking.user.name);
    const movieTitle = escapeHtml(booking.show.movie.title);
    const seats      = booking.bookedSeats.map(escapeHtml).join(", ");

    await sendEmail({
      to: booking.user.email,
      subject: `Payment Confirmation: "${booking.show.movie.title}" booked!`,
      body: `<div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Hi ${userName},</h2>
        <p>Your booking for <strong style="color: #F84565;">"${movieTitle}"</strong> is confirmed.</p>
        <p>
          <strong>Date:</strong> ${new Date(booking.show.showDateTime).toLocaleDateString("en-US")}<br />
          <strong>Time:</strong> ${new Date(booking.show.showDateTime).toLocaleTimeString("en-US")}<br />
          <strong>Seats:</strong> ${seats}<br />
          <strong>Amount:</strong> $${booking.amount}
        </p>
        <p>Enjoy the show! 🍿</p>
        <p>Thanks for booking with us!<br />— QuickShow Team</p>
      </div>`,
    });

    console.log("📩 Email sent to:", booking.user.email);
    return { success: true };
  }
);

// ─── Send show reminders (cron: every 8 hours) ────────────────────────────────
const sendShowReminders = inngest.createFunction(
  { id: "send-show-reminders" },
  { cron: "0 */8 * * *" },
  // HIGH-02 fix: no outer try/catch.
  async ({ step }) => {
    const now = new Date();
    const in8Hours = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const windowStart = new Date(in8Hours.getTime() - 10 * 60 * 1000);

    const reminderTasks = await step.run("prepare-reminder-tasks", async () => {
      const shows = await Show.find({
        showDateTime: { $gte: windowStart, $lte: in8Hours },
      }).populate("movie");

      const tasks = [];

      for (const show of shows) {
        if (!show.movie || !show.occupiedSeats) continue;

        // MED-01 fix: only send reminders to users with a PAID booking for this show.
        // Previously any user with a seat in occupiedSeats got a reminder, including
        // users who booked but never paid (seats still occupied until Inngest cleanup).
        const paidBookings = await Booking.find({ show: show._id, isPaid: true }).select("user");
        const paidUserIdSet = new Set(paidBookings.map((b) => b.user.toString()));

        const rawIds = [...new Set(show.occupiedSeats.values())];
        const userIds = rawIds
          .filter((id) => mongoose.Types.ObjectId.isValid(id) && paidUserIdSet.has(id))
          .map((id) => new mongoose.Types.ObjectId(id));

        if (!userIds.length) continue;

        const users = await User.find({ _id: { $in: userIds } }).select("name email");

        for (const user of users) {
          if (user.email) {
            tasks.push({
              userEmail:  user.email,
              userName:   escapeHtml(user.name),
              movieTitle: escapeHtml(show.movie.title),
              showTime:   show.showDateTime,
            });
          }
        }
      }

      return tasks;
    });

    if (!reminderTasks.length) return { sent: 0, message: "No reminders to send." };

    const batches = chunk(reminderTasks, EMAIL_BATCH_SIZE);
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < batches.length; i++) {
      const results = await step.run(`send-reminder-batch-${i + 1}`, async () =>
        Promise.allSettled(
          batches[i].map((task) =>
            sendEmail({
              to: task.userEmail,
              subject: `Reminder: "${task.movieTitle}" starts soon!`,
              body: `<div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Hello ${task.userName},</h2>
                <p>Your movie <strong style="color:#F84565;">"${task.movieTitle}"</strong>
                starts in approximately <strong>8 hours</strong>.</p>
                <p>Enjoy the show! 🍿 — QuickShow Team</p>
              </div>`,
            })
          )
        )
      );

      totalSent   += results.filter((r) => r.status === "fulfilled").length;
      totalFailed += results.filter((r) => r.status === "rejected").length;
    }

    console.log(`📬 Sent ${totalSent} reminder emails, ${totalFailed} failed`);
    return { sent: totalSent, failed: totalFailed };
  }
);

// ─── Notify all users when a new show is added ────────────────────────────────
const sendNewShowNotifications = inngest.createFunction(
  { id: "send-new-show-notifications" },
  { event: "app/show.added" },
  // HIGH-02 fix: no outer try/catch.
  async ({ event, step }) => {
    const movieTitle = escapeHtml(event.data.movieTitle);

    const users = await step.run("fetch-users", async () =>
      User.find({}).select("name email").lean()
    );

    const eligibleUsers = users.filter((u) => u.email);
    if (!eligibleUsers.length) return { sent: 0 };

    const batches = chunk(eligibleUsers, EMAIL_BATCH_SIZE);
    let totalSent = 0;

    for (let i = 0; i < batches.length; i++) {
      await step.run(`notify-batch-${i + 1}`, async () =>
        Promise.allSettled(
          batches[i].map((u) =>
            sendEmail({
              to: u.email,
              subject: `🎬 New Show Added: ${event.data.movieTitle}`,
              body: `<div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Hi ${escapeHtml(u.name)},</h2>
                <p>We've just added a new show: <strong style="color:#F84565;">"${movieTitle}"</strong></p>
                <p>Visit <a href="https://quickshow-sigma-roan.vercel.app/">QuickShow</a> to book now!</p>
                <p>Thanks,<br />QuickShow Team</p>
              </div>`,
            })
          )
        )
      );
      totalSent += batches[i].length;
    }

    console.log("📢 New show notifications sent:", totalSent);
    return { message: "Notifications sent.", sent: totalSent };
  }
);

// ─── Group booking: resolve at the original expiry ────────────────────────────
// GROUP-05: three outcomes, depending on what's paid when the timer hits:
//   - already fully paid       -> no-op (webhook already marked 'completed')
//   - nobody paid anything     -> release everything immediately, no decision
//                                  needed since there's nothing to preserve
//   - a MIX of paid + unpaid   -> do NOT auto-resolve. Hold the unpaid seats
//                                  a bit longer and hand the organizer a
//                                  decision (continue with partial, or
//                                  extend). This is the "smart expiry" case —
//                                  the one genuinely interesting distributed-
//                                  state design decision in the feature.
const releaseGroupBookingSeats = inngest.createFunction(
  { id: "release-group-booking-seats" },
  { event: "app/group-booking-expiry-check" },
  async ({ event, step }) => {
    await step.sleepUntil("wait-for-group-expiry", new Date(event.data.expiresAt));

    return await step.run("resolve-group-booking-expiry", async () => {
      const groupBooking = await GroupBooking.findById(event.data.groupBookingId);
      if (!groupBooking) return { success: false, reason: "Group booking not found" };
      if (!["active", "extended"].includes(groupBooking.status)) {
        // Already completed (fully paid) or resolved by an earlier run — no-op.
        return { success: true, skipped: true, status: groupBooking.status };
      }

      const paidCount = [...groupBooking.claims.values()].filter((c) => c.status === "paid").length;

      if (paidCount === 0) {
        const released = await releaseUnpaidGroupSeats(groupBooking, { finalStatus: "expired" });
        console.log("🎟️ Group booking expired, nothing was paid:", groupBooking._id.toString(), "| released:", released);
        return { success: true, outcome: "expired", releasedSeats: released };
      }

      // Mixed state — hand off to the organizer instead of deciding for them.
      const decisionDeadline = new Date(Date.now() + GROUP_DECISION_GRACE_MINUTES * 60 * 1000);
      await GroupBooking.findByIdAndUpdate(groupBooking._id, {
        $set: { status: "awaiting_decision", decisionDeadline },
      });

      await inngest.send({
        name: "app/group-booking-decision-timeout",
        data: {
          groupBookingId: groupBooking._id.toString(),
          decisionDeadline: decisionDeadline.toISOString(),
        },
      });

      console.log("🤔 Group booking awaiting organizer decision:", groupBooking._id.toString());
      return { success: true, outcome: "awaiting_decision" };
    });
  }
);

// ─── Group booking: release one stale per-seat claim ──────────────────────────
// GROUP-08: a claimed-but-unpaid seat used to only free up when the WHOLE
// group expired (up to 45+15 min) — meaning one unresponsive friend could
// block a seat from everyone else for the entire window. This fires
// GROUP_CLAIM_HOLD_MINUTES after each individual claim and reverts it if
// still unpaid, independent of the group's own timer.
const releaseStaleSeatClaim = inngest.createFunction(
  { id: "release-stale-seat-claim" },
  { event: "app/group-seat-claim-timeout" },
  async ({ event, step }) => {
    await step.sleepUntil("wait-for-claim-hold", new Date(event.data.releaseAt));

    return await step.run("revert-stale-claim", async () => {
      const { groupBookingId, seat } = event.data;
      const groupBooking = await GroupBooking.findById(groupBookingId);
      if (!groupBooking) return { success: false, reason: "Group booking not found" };
      if (!["active", "extended"].includes(groupBooking.status)) {
        // Group already resolved some other way — its own resolution path
        // already accounts for every seat.
        return { success: true, skipped: true, status: groupBooking.status };
      }

      const claim = groupBooking.claims.get(seat);
      if (!claim || claim.status !== "claimed") {
        // Already paid, already reverted, or the seat doesn't exist —
        // nothing to do. This check is what makes the job safe to have
        // scheduled unconditionally at claim time with no cancellation path.
        return { success: true, skipped: true, status: claim?.status };
      }

      // Same Stripe double-check as the group-level release, for the same
      // reason: the claimant may have paid moments before this job ran.
      if (claim.booking) {
        const actuallyPaid = await reconcileIfActuallyPaid(claim.booking);
        if (actuallyPaid) return { success: true, skipped: true, reason: "paid just in time" };
      }

      await GroupBooking.findByIdAndUpdate(groupBookingId, {
        $set: {
          [`claims.${seat}.status`]: "unclaimed",
          [`claims.${seat}.user`]: null,
          [`claims.${seat}.booking`]: null,
          [`claims.${seat}.claimedAt`]: null,
        },
      });

      if (claim.booking) {
        await Booking.deleteMany({ _id: claim.booking, isPaid: false });
      }

      console.log("↩️ Released stale seat claim:", groupBookingId, seat);
      return { success: true, released: true };
    });
  }
);

// ─── Group booking: default if the organizer never decides ───────────────────
// If the organizer doesn't respond within the grace window, default to
// "continue with partial" — never "cancel + refund everyone", because that
// would require refund infrastructure this feature deliberately doesn't have.
// Continuing only ever keeps money already collected; it never returns any.
const resolveGroupBookingDecisionTimeout = inngest.createFunction(
  { id: "resolve-group-booking-decision-timeout" },
  { event: "app/group-booking-decision-timeout" },
  async ({ event, step }) => {
    await step.sleepUntil("wait-for-decision-deadline", new Date(event.data.decisionDeadline));

    return await step.run("apply-default-decision", async () => {
      const groupBooking = await GroupBooking.findById(event.data.groupBookingId);
      if (!groupBooking) return { success: false, reason: "Group booking not found" };
      if (groupBooking.status !== "awaiting_decision") {
        // Organizer already acted (continue/extend), or it resolved some other way.
        return { success: true, skipped: true, status: groupBooking.status };
      }

      const released = await releaseUnpaidGroupSeats(groupBooking, { finalStatus: "completed" });

      console.log("⏱️ Organizer never decided — auto-continued with partial group:", groupBooking._id.toString(), "| released:", released);
      return { success: true, outcome: "auto-continued", releasedSeats: released };
    });
  }
);

export const functions = [
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
  sendShowReminders,
  sendNewShowNotifications,
  releaseGroupBookingSeats,
  resolveGroupBookingDecisionTimeout,
  releaseStaleSeatClaim,
];
