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
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
