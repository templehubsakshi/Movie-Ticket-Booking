import { inngest } from "../inngest/index.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import mongoose from "mongoose";
import Stripe from "stripe";

// MED-08 fix: instantiate Stripe once at module level, not per request.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// CRIT-03: Allowlist for valid seat IDs — rows A–J, columns 1–9.
// Prevents NoSQL injection and prototype pollution via user-supplied seat keys.
const SEAT_RE = /^[A-J][1-9]$/;

// ===================== CREATE BOOKING =====================
export const createBooking = async (req, res) => {
  try {
    const userId = req.userId;
    const { showId, selectedSeats } = req.body;

    if (!showId || !selectedSeats || !Array.isArray(selectedSeats) || selectedSeats.length === 0) {
      return res.status(400).json({ success: false, message: "showId and selectedSeats are required." });
    }
    if (selectedSeats.length > 5) {
      return res.status(400).json({ success: false, message: "Maximum 5 seats allowed per booking." });
    }

    // CRIT-03: Validate every seat ID against the allowlist before touching DB.
    for (const seat of selectedSeats) {
      if (typeof seat !== "string" || !SEAT_RE.test(seat)) {
        return res.status(400).json({ success: false, message: `Invalid seat identifier: "${seat}".` });
      }
    }

    // Atomic seat reservation — prevents double booking race condition
    const seatCondition = {};
    const seatUpdate = {};
    selectedSeats.forEach((seat) => {
      seatCondition[`occupiedSeats.${seat}`] = { $exists: false };
      seatUpdate[`occupiedSeats.${seat}`] = userId;
    });

    const updatedShow = await Show.findOneAndUpdate(
      { _id: showId, ...seatCondition },
      { $set: seatUpdate },
      { new: true }
    ).populate("movie");

    if (!updatedShow) {
      return res.status(409).json({ success: false, message: "One or more selected seats are no longer available." });
    }

    const booking = await Booking.create({
      user: new mongoose.Types.ObjectId(userId),
      show: showId,
      amount: updatedShow.showPrice * selectedSeats.length,
      bookedSeats: selectedSeats,
    });

    // CRIT-02 fix: Use server-side CLIENT_URL env var — never trust req.headers.origin.
    // An attacker could send Origin: https://evil.com and redirect victims post-payment.
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      success_url: `${clientUrl}/loading/my-bookings`,
      cancel_url:  `${clientUrl}/my-bookings`,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: updatedShow.movie.title },
            unit_amount: Math.round(booking.amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: { bookingId: booking._id.toString() },
      // HIGH-06 fix: Stripe session expires in 31 min — Inngest checks after 31 min too.
      // Previously Stripe was 30 min but Inngest deleted bookings after only 10 min,
      // meaning users who paid between minute 10–30 were charged with no booking.
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    });

    booking.paymentLink = session.url;
    await booking.save();

    await inngest.send({
      name: "app/checkpayment",
      data: { bookingId: booking._id.toString() },
    });

    return res.json({ success: true, url: session.url });

  } catch (error) {
    console.error("createBooking error:", error.message);
    return res.status(500).json({ success: false, message: "Booking failed. Please try again." });
  }
};

// ===================== GET OCCUPIED SEATS =====================
export const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;

    const showData = await Show.findById(showId);
    if (!showData) {
      return res.status(404).json({ success: false, message: "Show not found." });
    }

    const occupiedSeats = [...showData.occupiedSeats.keys()];
    return res.json({ success: true, occupiedSeats });

  } catch (error) {
    console.error("getOccupiedSeats error:", error.message);
    return res.status(500).json({ success: false, message: "Could not fetch seats." });
  }
};

// ===================== CHECK PAYMENT (admin only) =====================
// LOW-04 fix: moved inline route handler to controller for consistency.
export const triggerPaymentCheck = async (req, res) => {
  const { bookingId } = req.body;
  if (!bookingId) {
    return res.status(400).json({ error: "bookingId is required" });
  }
  try {
    await inngest.send({ name: "app/checkpayment", data: { bookingId } });
    return res.json({ message: "Payment check event sent to Inngest" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to trigger Inngest event" });
  }
};
