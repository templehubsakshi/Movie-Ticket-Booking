import Show from "../models/Show.js";
import Booking from "../models/Booking.js";
import GroupBooking from "../models/GroupBooking.js";
import { reconcileIfActuallyPaid } from "./paymentReconciliation.js";

// Value written into Show.occupiedSeats while a seat is held by an active
// group booking but not yet paid for by anyone. Deliberately NOT a valid
// Mongo ObjectId — sendShowReminders (inngest/index.js) already filters
// occupiedSeats values through mongoose.Types.ObjectId.isValid before
// treating them as a userId, so this sentinel is silently and safely
// ignored by the reminder job without that job needing to know group
// bookings exist.
export const groupHoldValue = (groupBookingId) => `group:${groupBookingId}`;

/**
 * Releases every seat in `groupBooking` that never got paid for (marking
 * them 'released'), deletes the unpaid sub-Booking docs that were holding
 * them, and — if `finalStatus` is given — atomically sets the group's
 * status in the SAME update as the released seats.
 *
 * GROUP-05: this only ever releases unpaid seats — anyone who already paid
 * keeps their seat untouched. That's what makes the whole feature refund-free
 * by construction: money only ever moves toward a seat that ends up
 * confirmed, so there is never anything to refund here, only seats to free.
 *
 * GROUP-07 (race safety): before treating any seat as "unpaid", this
 * double-checks with Stripe directly via reconcileIfActuallyPaid. Without
 * this, a payment that completes seconds before a cleanup job runs — timer
 * expires mid-checkout — could get its booking deleted before our webhook
 * arrives, charging the person with no seat to show for it.
 *
 * IMPORTANT: every write here is an atomic `$set`/`findByIdAndUpdate` on
 * specific dot-paths, never a full-document `.save()` of the `groupBooking`
 * passed in. reconcileIfActuallyPaid can concurrently write a *different*
 * seat's claim status via its own findByIdAndUpdate (when it discovers a
 * payment we didn't know about yet) — a full-document save of a possibly
 * stale in-memory copy would silently clobber that write. Dot-path $set
 * updates can't clobber fields they don't mention, so this is safe
 * regardless of what the passed-in `groupBooking` object's in-memory state is.
 *
 * Shared by every call site that resolves a group's fate:
 *   1. releaseGroupBookingSeats  (nobody paid anything by the deadline)
 *   2. resolveGroupBookingDecisionTimeout (organizer never responded)
 *   3. groupBookingController.decideGroupBooking (organizer chose "continue")
 *
 * Naturally idempotent: an already-'released' or already-'paid' seat is
 * skipped, so calling this twice for the same group (e.g. a double-click on
 * "continue") is harmless.
 */
export const releaseUnpaidGroupSeats = async (groupBooking, { finalStatus } = {}) => {
  const stillUnpaidSeats = [];

  for (const [seat, claim] of groupBooking.claims.entries()) {
    if (claim.status === "paid" || claim.status === "released") continue;

    if (claim.booking) {
      const actuallyPaid = await reconcileIfActuallyPaid(claim.booking);
      if (actuallyPaid) continue; // Stripe says it went through — leave it alone
    }
    stillUnpaidSeats.push(seat);
  }

  if (stillUnpaidSeats.length) {
    const show = await Show.findById(groupBooking.show);
    if (show) {
      stillUnpaidSeats.forEach((seat) => {
        // Safety check: only delete if it's still our own sentinel value —
        // guards against a race where the seat was somehow reassigned
        // between reading claims above and writing here.
        if (show.occupiedSeats.get(seat) === groupHoldValue(groupBooking._id)) {
          show.occupiedSeats.delete(seat);
        }
      });
      await show.save();
    }

    await Booking.deleteMany({ groupBooking: groupBooking._id, isPaid: false });
  }

  const setOps = {};
  stillUnpaidSeats.forEach((seat) => {
    setOps[`claims.${seat}.status`]    = "released";
    setOps[`claims.${seat}.user`]      = null;
    setOps[`claims.${seat}.booking`]   = null;
    setOps[`claims.${seat}.claimedAt`] = null;
  });
  if (finalStatus) {
    setOps.status = finalStatus;
    setOps.decisionDeadline = null;
  }

  if (Object.keys(setOps).length) {
    await GroupBooking.findByIdAndUpdate(groupBooking._id, { $set: setOps });
  }

  return stillUnpaidSeats;
};
