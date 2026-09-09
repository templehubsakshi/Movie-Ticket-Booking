import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user:    { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    show:    { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Show" },
    amount:  { type: Number, required: true },
    // FIX #10: Use [String] instead of bare Array.
    // The old `type: Array` gave Mongoose no schema info — no type coercion,
    // no query operators, no validation. [String] is explicit and correct.
    bookedSeats: { type: [String], required: true },
    isPaid:      { type: Boolean, default: false },
    paymentLink: { type: String },
    // Set when the Stripe Checkout session is created. Lets us double-check
    // payment status directly with Stripe if our webhook is delayed —
    // used as a safety net right before any cleanup job would otherwise
    // delete/release a booking that looks unpaid in our own DB.
    stripeSessionId: { type: String, default: null },
    // Set only for a per-person sub-payment created via the group booking
    // flow (see groupBookingController.payForClaimedSeats). null for a
    // normal solo booking — every existing query/read of Booking is
    // unaffected since this field is additive and optional.
    groupBooking: { type: mongoose.Schema.Types.ObjectId, ref: "GroupBooking", default: null },
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
