import mongoose from "mongoose";

// ------------------------
// Booking Schema
// ------------------------
const bookingSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, ref: "User" }, 
    // CURRENT: String type, ref diya hai, abhi kaam kar raha hai
    // FUTURE REFERENCE: Agar populate("user") use karni ho → ObjectId better
    // user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" }

    show: { type: String, required: true, ref: "Show" }, 
    // CURRENT: String type, abhi kaam kar raha hai
    // FUTURE: show: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Show" }

    amount: { type: Number, required: true }, 
    bookedSeats: { type: Array, required: true },
    isPaid: { type: Boolean, default: false },
    paymentLink: { type: String }, // Stripe link, optional
  },
  { timestamps: true } // createdAt, updatedAt automatically add hota hai
);

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;

// -------------------------------------------------
// NOTE FOR FUTURE:
// -------------------------------------------------
// 1. CURRENT: 'user' aur 'show' String type hai → populate call nahi karoge to problem nahi
// 2. FUTURE: Agar populate() karni hai ya DB reference strict chahiye
//    → use ObjectId type:
//    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" }
//    show: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Show" }
// 3. bookedSeats: Array of strings → okay
// 4. isPaid, paymentLink → optional fields, default values fine
