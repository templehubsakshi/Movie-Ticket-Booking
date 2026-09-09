import mongoose from "mongoose";

// A single seat's claim state within a group booking.
//   unclaimed -> no one has picked this seat yet
//   claimed   -> a friend has picked it but not paid yet (temporary hold —
//                see claimedAt / GROUP_CLAIM_HOLD_MINUTES: if they don't pay
//                within the hold window, a per-seat Inngest job reverts this
//                back to 'unclaimed' so other friends aren't blocked by one
//                person sitting on a seat)
//   paid      -> a friend has paid for it (linked Booking exists and is isPaid)
//   released  -> was claimed/unclaimed when the group resolved (expired, or
//                organizer chose "continue with partial") and got freed back
//                to the venue. Terminal — a released seat is never reused
//                within this same GroupBooking.
const claimSchema = new mongoose.Schema(
  {
    status:    { type: String, enum: ["unclaimed", "claimed", "paid", "released"], default: "unclaimed" },
    user:      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    booking:   { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    claimedAt: { type: Date, default: null },
  },
  { _id: false }
);

const groupBookingSchema = new mongoose.Schema(
  {
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    show:      { type: mongoose.Schema.Types.ObjectId, ref: "Show", required: true },

    // Short shareable code — what goes in the link sent to friends,
    // e.g. https://quickshow.app/group-booking/a1b2c3d4
    code: { type: String, required: true, unique: true, index: true },

    pricePerSeat: { type: Number, required: true },

    // Map type mirrors Show.occupiedSeats — seat key -> claim subdocument.
    // Mongoose tracks Map mutations automatically, same as occupiedSeats.
    claims: { type: Map, of: claimSchema, required: true },

    // State machine:
    //   active             -> normal claim/pay flow, seats held
    //   extended           -> same as active, but the organizer already used
    //                         the one allowed timer extension — kept as a
    //                         distinct label (not folded back into 'active')
    //                         so the UI/API can show that fact and so the
    //                         re-armed expiry job's guard is explicit about
    //                         which states are "still open"
    //   awaiting_decision  -> timer hit with a MIX of paid + unpaid seats;
    //                         nothing is released yet, waiting on the
    //                         organizer (or the decision-timeout job) to
    //                         pick continue-with-partial vs extend
    //   completed          -> every seat ended up paid (fully, or partial
    //                         after an organizer "continue" decision)
    //   expired            -> timer hit and NOBODY had paid anything, so
    //                         everything was released with no decision needed
    //   cancelled          -> reserved for future manual-cancel support;
    //                         unused by the current flow
    status: {
      type: String,
      enum: ["active", "extended", "awaiting_decision", "completed", "expired", "cancelled"],
      default: "active",
    },

    expiresAt: { type: Date, required: true },

    // Only set while status === 'awaiting_decision'. If the organizer hasn't
    // responded by this time, the decision-timeout job auto-applies
    // "continue with partial" (see inngest/index.js) — that default was
    // chosen because it never requires refund infrastructure: it only ever
    // keeps money that was already collected, never returns it.
    decisionDeadline: { type: Date, default: null },

    // Caps how many times "extend" can be used so a group can't hold seats
    // hostage indefinitely. See GROUP_MAX_EXTENSIONS in configs/constants.js.
    extensionsUsed: { type: Number, default: 0 },
  },
  { timestamps: true, minimize: false }
);

groupBookingSchema.index({ expiresAt: 1 });

const GroupBooking = mongoose.model("GroupBooking", groupBookingSchema);
export default GroupBooking;
