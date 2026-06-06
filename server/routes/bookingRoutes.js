import express from "express";
import {
  createBooking,
  getOccupiedSeats,
  triggerPaymentCheck,
} from "../controllers/bookingController.js";
import { protectRoute, protectAdmin } from "../middleware/auth.js";

const bookingRouter = express.Router();

// Creating a booking requires a logged-in user
bookingRouter.post("/create", protectRoute, createBooking);

// Getting occupied seats is public (needed to render seat layout)
bookingRouter.get("/seats/:showId", getOccupiedSeats);

// Manually trigger a payment check — admin only to prevent privilege escalation.
// LOW-04 fix: moved inline handler to controller for consistency.
bookingRouter.post("/check-payment", protectAdmin, triggerPaymentCheck);

export default bookingRouter;
