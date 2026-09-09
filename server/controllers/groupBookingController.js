import crypto from "crypto";
import mongoose from "mongoose";
import Stripe from "stripe";
import GroupBooking from "../models/GroupBooking.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/User.js";
import { inngest } from "../inngest/index.js";
import { groupHoldValue, releaseUnpaidGroupSeats } from "../utils/groupBookingRelease.js";
import {
  SEAT_RE,
  GROUP_BOOKING_EXPIRY_MINUTES,
  GROUP_BOOKING_MAX_SEATS,
  GROUP_CLAIM_HOLD_MINUTES,
  GROUP_EXTENSION_MINUTES,
  GROUP_MAX_EXTENSIONS,
} from "../configs/constants.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const generateCode = () => crypto.randomBytes(4).toString("hex"); // 8 hex chars

// ===================== CREATE GROUP BOOKING =====================
export const createGroupBooking = async (req, res) => {
  try {
    const userId = req.userId;
    const { showId, selectedSeats } = req.body;

    if (!showId || !selectedSeats || !Array.isArray(selectedSeats) || selectedSeats.length === 0) {
      return res.status(400).json({ success: false, message: "showId and selectedSeats are required." });
    }
    if (selectedSeats.length < 2) {
      return res.status(400).json({ success: false, message: "A group booking needs at least 2 seats — use a normal booking for one." });
    }
    if (selectedSeats.length > GROUP_BOOKING_MAX_SEATS) {
      return res.status(400).json({ success: false, message: `Maximum ${GROUP_BOOKING_MAX_SEATS} seats allowed per group booking.` });
    }
    for (const seat of selectedSeats) {
      if (typeof seat !== "string" || !SEAT_RE.test(seat)) {
        return res.status(400).json({ success: false, message: `Invalid seat identifier: "${seat}".` });
      }
    }

    const show = await Show.findById(showId).populate("movie");
    if (!show) {
      return res.status(404).json({ success: false, message: "Show not found." });
    }

    const expiresAt = new Date(Date.now() + GROUP_BOOKING_EXPIRY_MINUTES * 60 * 1000);
    const claims = new Map(selectedSeats.map((seat) => [seat, { status: "unclaimed" }]));

    // GROUP-02: create the GroupBooking doc *before* locking seats, purely to
    // get an _id to use as the occupiedSeats sentinel. If the atomic seat
    // lock below fails (race with another booking), we delete this doc again
    // — so a still-'active' but seat-less GroupBooking can exist for a brief
    // window. Harmless (nothing reads a GroupBooking independent of its
    // seats), but it's why the cleanup-on-failure path below is required.
    let code = generateCode();
    let groupBooking;
    for (let attempt = 0; attempt < 5 && !groupBooking; attempt++) {
      try {
        groupBooking = await GroupBooking.create({
          organizer: userId,
          show: showId,
          code,
          pricePerSeat: show.showPrice,
          claims,
          expiresAt,
        });
      } catch (err) {
        if (err.code === 11000) {
          code = generateCode(); // code collision — vanishingly rare, retry
          continue;
        }
        throw err;
      }
    }
    if (!groupBooking) {
      return res.status(500).json({ success: false, message: "Could not generate a unique group code. Please try again." });
    }

    // Atomic seat reservation — same pattern as bookingController.createBooking.
    const seatCondition = {};
    const seatUpdate = {};
    selectedSeats.forEach((seat) => {
      seatCondition[`occupiedSeats.${seat}`] = { $exists: false };
      seatUpdate[`occupiedSeats.${seat}`] = groupHoldValue(groupBooking._id);
    });

    const updatedShow = await Show.findOneAndUpdate(
      { _id: showId, ...seatCondition },
      { $set: seatUpdate },
      { new: true }
    );

    if (!updatedShow) {
      await GroupBooking.findByIdAndDelete(groupBooking._id);
      return res.status(409).json({ success: false, message: "One or more selected seats are no longer available." });
    }

    await inngest.send({
      name: "app/group-booking-expiry-check",
      data: {
        groupBookingId: groupBooking._id.toString(),
        expiresAt: groupBooking.expiresAt.toISOString(),
      },
    });

    return res.json({
      success: true,
      code: groupBooking.code,
      expiresAt: groupBooking.expiresAt,
      pricePerSeat: groupBooking.pricePerSeat,
      seats: selectedSeats,
    });
  } catch (error) {
    console.error("createGroupBooking error:", error.message);
    return res.status(500).json({ success: false, message: "Could not create group booking. Please try again." });
  }
};

// ===================== GET GROUP BOOKING (by code) =====================
// Polled from the client every few seconds to simulate live status — no
// websocket/SSE layer exists in this codebase yet, so plain polling gets
// ~90% of the "live" demo effect for a fraction of the effort. A socket
// layer (room-per-code, broadcast on claim/pay/webhook) is the natural next
// step if this needed to scale past a demo.
export const getGroupBooking = async (req, res) => {
  try {
    const { code } = req.params;
    const groupBooking = await GroupBooking.findOne({ code })
      .populate({ path: "show", populate: { path: "movie" } })
      .populate("organizer", "name");

    if (!groupBooking) {
      return res.status(404).json({ success: false, message: "Group booking not found." });
    }

    const claimsObj = Object.fromEntries(groupBooking.claims);
    const claimantIds = [
      ...new Set(Object.values(claimsObj).map((c) => c.user).filter(Boolean).map(String)),
    ];
    const claimants = claimantIds.length
      ? await User.find({ _id: { $in: claimantIds } }).select("name")
      : [];
    const nameById = Object.fromEntries(claimants.map((u) => [u._id.toString(), u.name]));

    const claims = Object.fromEntries(
      Object.entries(claimsObj).map(([seat, c]) => [
        seat,
        {
          status: c.status,
          userName: c.user ? nameById[c.user.toString()] ?? null : null,
          isYou: c.user ? c.user.toString() === req.userId : false,
        },
      ])
    );

    const isOrganizer = groupBooking.organizer?._id?.toString() === req.userId;

    return res.json({
      success: true,
      groupBooking: {
        code: groupBooking.code,
        status: groupBooking.status,
        expiresAt: groupBooking.expiresAt,
        decisionDeadline: groupBooking.decisionDeadline,
        extensionsUsed: groupBooking.extensionsUsed,
        maxExtensions: GROUP_MAX_EXTENSIONS,
        pricePerSeat: groupBooking.pricePerSeat,
        organizerName: groupBooking.organizer?.name ?? null,
        isOrganizer,
        movieTitle: groupBooking.show?.movie?.title ?? null,
        showDateTime: groupBooking.show?.showDateTime ?? null,
        claims,
      },
    });
  } catch (error) {
    console.error("getGroupBooking error:", error.message);
    return res.status(500).json({ success: false, message: "Could not fetch group booking." });
  }
};

// ===================== CLAIM SEATS =====================
export const claimSeats = async (req, res) => {
  try {
    const userId = req.userId;
    const { code } = req.params;
    const { seats } = req.body;

    if (!Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ success: false, message: "seats is required." });
    }

    // Atomic per-seat claim — same shape as the occupiedSeats lock in
    // bookingController.createBooking: build a condition requiring every
    // targeted seat to currently be 'unclaimed', and a single $set that
    // claims them all. If any seat was claimed by someone else between
    // page-load and this request, the findOneAndUpdate matches nothing and
    // we return 409 — no partial claims are possible.
    const claimedAt = new Date();
    const condition = { code, status: { $in: ["active", "extended"] } };
    const update = {};
    seats.forEach((seat) => {
      condition[`claims.${seat}.status`] = "unclaimed";
      update[`claims.${seat}.status`] = "claimed";
      update[`claims.${seat}.user`] = userId;
      update[`claims.${seat}.claimedAt`] = claimedAt;
    });

    const updated = await GroupBooking.findOneAndUpdate(condition, { $set: update }, { new: true });

    if (!updated) {
      const existing = await GroupBooking.findOne({ code });
      if (!existing) return res.status(404).json({ success: false, message: "Group booking not found." });
      if (!["active", "extended"].includes(existing.status)) {
        return res.status(409).json({ success: false, message: "This group booking is no longer accepting claims." });
      }
      return res.status(409).json({ success: false, message: "One or more of those seats were just claimed by someone else." });
    }

    // GROUP-08: arm a per-seat hold timer so this claim doesn't block the
    // seat from other friends indefinitely if this person never pays. Safe
    // to fire-and-forget — the job itself checks the seat is still
    // 'claimed' (and re-checks Stripe) before doing anything, so it's a
    // no-op if the seat gets paid for, or reclaimed after a prior release.
    const releaseAt = new Date(claimedAt.getTime() + GROUP_CLAIM_HOLD_MINUTES * 60 * 1000);
    await Promise.all(
      seats.map((seat) =>
        inngest.send({
          name: "app/group-seat-claim-timeout",
          data: { groupBookingId: updated._id.toString(), seat, releaseAt: releaseAt.toISOString() },
        })
      )
    );

    return res.json({ success: true, message: "Seats claimed — pay for them to lock in your spot." });
  } catch (error) {
    console.error("claimSeats error:", error.message);
    return res.status(500).json({ success: false, message: "Could not claim seats." });
  }
};

// ===================== PAY FOR CLAIMED SEATS =====================
export const payForClaimedSeats = async (req, res) => {
  try {
    const userId = req.userId;
    const { code } = req.params;
    const { seats } = req.body;

    if (!Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ success: false, message: "seats is required." });
    }

    const groupBooking = await GroupBooking.findOne({ code }).populate({ path: "show", populate: "movie" });
    if (!groupBooking) return res.status(404).json({ success: false, message: "Group booking not found." });
    if (!["active", "extended"].includes(groupBooking.status)) {
      return res.status(409).json({ success: false, message: "This group booking is no longer accepting payments." });
    }
    if (groupBooking.expiresAt <= new Date()) {
      return res.status(409).json({ success: false, message: "This group booking has expired." });
    }

    // GROUP-03: only allow paying for seats YOU claimed — enforced
    // server-side, not just hidden in the UI. The claim step is what records
    // who owes what; letting user A pay for user B's claimed seat would
    // desync claims.<seat>.user from who is actually being charged.
    for (const seat of seats) {
      const claim = groupBooking.claims.get(seat);
      if (!claim || claim.status !== "claimed" || claim.user?.toString() !== userId) {
        return res.status(403).json({ success: false, message: `Seat ${seat} isn't claimed by you.` });
      }
    }

    const amount = groupBooking.pricePerSeat * seats.length;

    const booking = await Booking.create({
      user: new mongoose.Types.ObjectId(userId),
      show: groupBooking.show._id,
      amount,
      bookedSeats: seats,
      groupBooking: groupBooking._id,
    });

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    // Route back through the existing /loading/:nextUrl page. It just does
    // navigate(`/${nextUrl}`) after a short delay, and React Router decodes
    // the param automatically — so a URI-encoded value containing a slash
    // works with zero changes to that route or component.
    const nextUrl = encodeURIComponent(`group-booking/${code}`);

    const session = await stripe.checkout.sessions.create({
      success_url: `${clientUrl}/loading/${nextUrl}`,
      cancel_url: `${clientUrl}/group-booking/${code}`,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `${groupBooking.show.movie.title} (group booking)` },
            unit_amount: Math.round(groupBooking.pricePerSeat * 100),
          },
          quantity: seats.length,
        },
      ],
      mode: "payment",
      metadata: {
        bookingId: booking._id.toString(),
        groupBookingId: groupBooking._id.toString(),
      },
      // GROUP-04: capped by the group's own expiry, not the fixed 31-minute
      // window solo bookings use — a friend paying near the end of the group
      // window shouldn't get a session that outlives the group itself.
      // Stripe requires expires_at at least 30 minutes out, so we floor it there.
      expires_at: Math.max(
        Math.floor(groupBooking.expiresAt.getTime() / 1000),
        Math.floor(Date.now() / 1000) + 30 * 60
      ),
    });

    booking.paymentLink = session.url;
    booking.stripeSessionId = session.id;
    await booking.save();

    // Deliberately NOT sending 'app/checkpayment' here (unlike solo
    // bookings) — that job unconditionally deletes the Booking and frees its
    // seats after 31 minutes with no awareness of group state. Cleanup for
    // group sub-bookings is handled entirely by the group expiry/decision
    // Inngest functions, which already know how to release only unpaid seats.

    return res.json({ success: true, url: session.url });
  } catch (error) {
    console.error("payForClaimedSeats error:", error.message);
    return res.status(500).json({ success: false, message: "Could not start payment. Please try again." });
  }
};

// ===================== ORGANIZER DECISION (mixed expiry) =====================
// Only reachable while status === 'awaiting_decision', i.e. the timer hit
// with some seats paid and some not. Two options only, by design:
//   'continue' -> release the unpaid seats, keep the group at whatever got paid
//   'extend'   -> give the unclaimed/unpaid seats more time (capped, see
//                  GROUP_MAX_EXTENSIONS) rather than losing them immediately
// There is deliberately no 'cancel + refund everyone' option — that would
// require Stripe refund infrastructure this feature doesn't have. Keeping it
// to these two options is what keeps the whole design refund-free.
export const decideGroupBooking = async (req, res) => {
  try {
    const userId = req.userId;
    const { code } = req.params;
    const { action } = req.body;

    if (!["continue", "extend"].includes(action)) {
      return res.status(400).json({ success: false, message: "action must be 'continue' or 'extend'." });
    }

    const groupBooking = await GroupBooking.findOne({ code });
    if (!groupBooking) return res.status(404).json({ success: false, message: "Group booking not found." });
    if (groupBooking.organizer.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Only the organizer can decide." });
    }
    if (groupBooking.status !== "awaiting_decision") {
      return res.status(409).json({ success: false, message: "There's no pending decision on this group booking." });
    }

    if (action === "continue") {
      const released = await releaseUnpaidGroupSeats(groupBooking, { finalStatus: "completed" });
      return res.json({ success: true, outcome: "continued", releasedSeats: released });
    }

    // action === "extend"
    // GROUP-09: the extension count check + increment happens in ONE atomic
    // findOneAndUpdate (condition: extensionsUsed < GROUP_MAX_EXTENSIONS,
    // $inc: extensionsUsed). A separate read-then-write here (check the
    // count, then save) would let two rapid clicks both pass the check
    // before either write lands, granting two extensions instead of one.
    const newExpiresAt = new Date(Date.now() + GROUP_EXTENSION_MINUTES * 60 * 1000);
    const extended = await GroupBooking.findOneAndUpdate(
      {
        code,
        organizer: userId,
        status: "awaiting_decision",
        extensionsUsed: { $lt: GROUP_MAX_EXTENSIONS },
      },
      {
        $set: { status: "extended", expiresAt: newExpiresAt, decisionDeadline: null },
        $inc: { extensionsUsed: 1 },
      },
      { new: true }
    );

    if (!extended) {
      return res.status(409).json({
        success: false,
        message: "Could not extend — the decision window may have closed, or the one allowed extension was already used.",
      });
    }

    // Re-arm the expiry check against the new deadline. The still-unpaid
    // seats were never released while 'awaiting_decision', so their
    // occupiedSeats sentinel and claim state are untouched and this just
    // gives them a second window to get paid.
    await inngest.send({
      name: "app/group-booking-expiry-check",
      data: { groupBookingId: extended._id.toString(), expiresAt: newExpiresAt.toISOString() },
    });

    return res.json({ success: true, outcome: "extended", expiresAt: newExpiresAt });
  } catch (error) {
    console.error("decideGroupBooking error:", error.message);
    return res.status(500).json({ success: false, message: "Could not apply decision." });
  }
};
