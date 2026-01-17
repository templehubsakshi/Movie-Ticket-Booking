// import express from "express";
// // Booking ke controllers import kiye
// // Controller me actual logic hota hai (DB save, read, etc.)
// import {
//   createBooking,
//   getOccupiedSeats,
// } from "../controllers/bookingController.js";
// // Express Router create kiya
// // Router ek mini server hai jo URLs ko functions se connect karta
// const bookingRouter = express.Router();
// // POST request /api/booking/create
// // Frontend yahan seat info aur showId bhejega
// // Ye function controller ke createBooking me jayega
// bookingRouter.post("/create", createBooking);
// // GET request /api/booking/seats/:showId
// // showId URL parameter me aata hai
// // Ye function controller ke getOccupiedSeats me jayega
// bookingRouter.get("/seats/:showId", getOccupiedSeats);
// // Export router taaki server.js me use ho sake
// export default bookingRouter;
import express from "express";
// Booking ke controllers import kiye
// Controller me actual logic hota hai (DB save, read, etc.)
import {
  createBooking,
  getOccupiedSeats,
} from "../controllers/bookingController.js";

// Inngest import karo
import { inngest } from "../inngest/index.js";

// Express Router create kiya
const bookingRouter = express.Router();

// =====================
// Existing routes
// =====================
// POST request /api/booking/create
bookingRouter.post("/create", createBooking);

// GET request /api/booking/seats/:showId
bookingRouter.get("/seats/:showId", getOccupiedSeats);

// =====================
// NEW: Trigger payment check
// =====================
bookingRouter.post("/check-payment", async (req, res) => {
  const { bookingId } = req.body;

  if (!bookingId) {
    return res.status(400).json({ error: "bookingId is required" });
  }

  try {
    // Trigger Inngest event
    await inngest.send({
      name: "app/checkpayment",
      data: { bookingId },
    });

    return res.json({ message: "Payment check event sent to Inngest" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to trigger Inngest event" });
  }
});

export default bookingRouter;
