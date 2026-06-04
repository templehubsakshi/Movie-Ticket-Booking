import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import { sendEmail } from "../configs/nodeMailer.js";

// Inngest client
export const inngest = new Inngest({ id: "movie-ticket-booking" });

// ─── Release seats & delete booking if unpaid after 10 min ────────────────────
const releaseSeatsAndDeleteBooking = inngest.createFunction(
  { id: "release-seats-delete-booking" },
  { event: "app/checkpayment" },
  async ({ event, step }) => {
    try {
      console.log("🔥 Payment check started:", event.data);

      const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
      await step.sleepUntil("wait-for-10-minutes", tenMinutesLater);

      await step.run("check-payment-status", async () => {
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
          delete show.occupiedSeats[seat];
        });

        show.markModified("occupiedSeats");
        await show.save();
        await Booking.findByIdAndDelete(booking._id);

        console.log("🗑️ Booking deleted & seats released:", bookingId);
        return { success: true, deleted: true };
      });
    } catch (error) {
      console.error("❌ Seat release failed:", error);
      return { success: false, error: error.message };
    }
  }
);

// ─── Send booking confirmation email ──────────────────────────────────────────
const sendBookingConfirmationEmail = inngest.createFunction(
  { id: "send-booking-confirmation-email" },
  { event: "app/show.booked" },
  async ({ event }) => {
    try {
      const { bookingId } = event.data;
      console.log("📧 Sending confirmation email for booking:", bookingId);

      const booking = await Booking.findById(bookingId)
        .populate({ path: "show", populate: { path: "movie", model: "Movie" } })
        .populate("user");

      if (!booking || !booking.user?.email) {
        console.log("⚠️ Booking or user email not found");
        return { success: false };
      }

      await sendEmail({
        to: booking.user.email,
        subject: `Payment Confirmation: "${booking.show.movie.title}" booked!`,
        body: `<div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Hi ${booking.user.name},</h2>
          <p>Your booking for <strong style="color: #F84565;">"${booking.show.movie.title}"</strong> is confirmed.</p>
          <p>
            <strong>Date:</strong> ${new Date(booking.show.showDateTime).toLocaleDateString("en-US")}<br />
            <strong>Time:</strong> ${new Date(booking.show.showDateTime).toLocaleTimeString("en-US")}<br />
            <strong>Seats:</strong> ${booking.bookedSeats.join(", ")}<br />
            <strong>Amount:</strong> $${booking.amount}
          </p>
          <p>Enjoy the show! 🍿</p>
          <p>Thanks for booking with us!<br />— QuickShow Team</p>
        </div>`,
      });

      console.log("📩 Email sent to:", booking.user.email);
      return { success: true };
    } catch (error) {
      console.error("❌ Email failed:", error);
      return { success: false, error: error.message };
    }
  }
);

// ─── Send show reminders (cron: every 8 hours) ────────────────────────────────
const sendShowReminders = inngest.createFunction(
  { id: "send-show-reminders" },
  { cron: "0 */8 * * *" },
  async ({ step }) => {
    try {
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

    const userIds = [...new Set(Object.values(show.occupiedSeats))];
    if (!userIds.length) continue;

    const users = await User.find({ _id: { $in: userIds } }).select("name email");

    for (const user of users) {
      if (user.email) {
        tasks.push({
          userEmail: user.email,
          userName: user.name,
          movieTitle: show.movie.title,
          showTime: show.showDateTime,
        });
      }
    }
  }

  return tasks;
});

      if (!reminderTasks.length) return { sent: 0, message: "No reminders to send." };

      const results = await step.run("send-all-reminders", async () =>
        Promise.allSettled(
          reminderTasks.map((task) =>
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

      const sent = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - sent;
      console.log(`📬 Sent ${sent} reminder emails, ${failed} failed`);
      return { sent, failed };
    } catch (error) {
      console.error("❌ Reminder job failed:", error);
      return { success: false, error: error.message };
    }
  }
);

// ─── Notify all users when a new show is added ────────────────────────────────
const sendNewShowNotifications = inngest.createFunction(
  { id: "send-new-show-notifications" },
  { event: "app/show.added" },
  async ({ event }) => {
    try {
      const { movieTitle } = event.data;
      const users = await User.find({});

      await Promise.allSettled(
        users
          .filter((u) => u.email)
          .map((u) =>
            sendEmail({
              to: u.email,
              subject: `🎬 New Show Added: ${movieTitle}`,
              body: `<div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Hi ${u.name},</h2>
                <p>We've just added a new show: <strong style="color:#F84565;">"${movieTitle}"</strong></p>
                <p>Visit <a href="https://quickshow-sigma-roan.vercel.app/">QuickShow</a> to book now!</p>
                <p>Thanks,<br />QuickShow Team</p>
              </div>`,
            })
          )
      );

      console.log("📢 New show notifications sent");
      return { message: "Notifications sent." };
    } catch (error) {
      console.error("❌ New show notification failed:", error);
      return { success: false, error: error.message };
    }
  }
);

export const functions = [
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
  sendShowReminders,
  sendNewShowNotifications,
];
