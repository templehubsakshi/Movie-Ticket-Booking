import Stripe from "stripe";
import Booking from "../models/Booking.js";
import GroupBooking from "../models/GroupBooking.js";
import Show from "../models/Show.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// If `booking` belongs to a group, flips that group's claim map entries to
// 'paid' and converts the corresponding Show.occupiedSeats sentinel
// ("group:<id>") to the payer's real userId — the same shape a solo
// booking's occupiedSeats entry has, so anything reading occupiedSeats as a
// userId (e.g. sendShowReminders) works unmodified for paid group seats.
const reconcileGroupBookingPayment = async (booking) => {
  const claimUpdate = {};
  booking.bookedSeats.forEach((seat) => {
    claimUpdate[`claims.${seat}.status`]    = "paid";
    claimUpdate[`claims.${seat}.booking`]   = booking._id;
    claimUpdate[`claims.${seat}.claimedAt`] = null; // no longer a ticking hold
  });

  const groupBooking = await GroupBooking.findByIdAndUpdate(
    booking.groupBooking,
    { $set: claimUpdate },
    { new: true }
  );
  if (!groupBooking) return; // group was somehow deleted — nothing more to reconcile

  const seatUpdate = {};
  booking.bookedSeats.forEach((seat) => {
    seatUpdate[`occupiedSeats.${seat}`] = booking.user.toString();
  });
  await Show.findByIdAndUpdate(booking.show, { $set: seatUpdate });

  const allPaid = [...groupBooking.claims.values()].every(
    (c) => c.status === "paid" || c.status === "released"
  );
  if (allPaid && groupBooking.status !== "completed") {
    await GroupBooking.findByIdAndUpdate(groupBooking._id, {
      $set: { status: "completed", decisionDeadline: null },
    });
  }
};

/**
 * Marks a Booking paid and reconciles its group (if any). Idempotent — safe
 * to call more than once for the same booking; returns false if it was
 * already paid so callers can tell "did nothing" from "just marked paid".
 */
export const markBookingPaid = async (booking) => {
  if (booking.isPaid) return false;

  booking.isPaid = true;
  booking.paymentLink = "";
  await booking.save();

  if (booking.groupBooking) {
    await reconcileGroupBookingPayment(booking);
  }
  return true;
};

/**
 * Safety net for the "timer expired mid-payment" race: a Stripe Checkout
 * session can complete a few seconds before our webhook is delivered and
 * processed. If a cleanup job is about to release/delete a booking that
 * *looks* unpaid in our own DB, this checks directly with Stripe first —
 * cheap insurance against charging someone with no seat to show for it.
 * Returns true if the booking is (now) confirmed paid.
 */
export const reconcileIfActuallyPaid = async (bookingId) => {
  if (!bookingId) return false;
  const booking = await Booking.findById(bookingId);
  if (!booking) return false;
  if (booking.isPaid) return true;
  if (!booking.stripeSessionId) return false;

  try {
    const session = await stripe.checkout.sessions.retrieve(booking.stripeSessionId);
    if (session.payment_status === "paid") {
      await markBookingPaid(booking);
      return true;
    }
  } catch (err) {
    // Session lookup failing (e.g. expired/deleted on Stripe's side) is not
    // itself evidence of payment — fall through and treat as unpaid.
    console.error("reconcileIfActuallyPaid: Stripe lookup failed:", err.message);
  }
  return false;
};
