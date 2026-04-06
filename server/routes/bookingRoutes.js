import express from "express";
import { createBooking, getOccupiedSeats } from "../controllers/bookingController.js";
import { inngest } from "../inngest/index.js";
import { protectRoute } from "../middleware/auth.js";

const bookingRouter = express.Router();

// Creating a booking requires a logged-in user
bookingRouter.post("/create", protectRoute, createBooking);

// Getting occupied seats is public (needed to render seat layout)
bookingRouter.get("/seats/:showId", getOccupiedSeats);

// Manually trigger Inngest payment check (admin/testing)
bookingRouter.post("/check-payment", protectRoute, async (req, res) => {
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
});

export default bookingRouter;
