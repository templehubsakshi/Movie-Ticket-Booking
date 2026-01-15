import express from "express";
// Booking ke controllers import kiye
// Controller me actual logic hota hai (DB save, read, etc.)
import {
  createBooking,
  getOccupiedSeats,
} from "../controllers/bookingController.js";
// Express Router create kiya
// Router ek mini server hai jo URLs ko functions se connect karta
const bookingRouter = express.Router();
// POST request /api/booking/create
// Frontend yahan seat info aur showId bhejega
// Ye function controller ke createBooking me jayega
bookingRouter.post("/create", createBooking);
// GET request /api/booking/seats/:showId
// showId URL parameter me aata hai
// Ye function controller ke getOccupiedSeats me jayega
bookingRouter.get("/seats/:showId", getOccupiedSeats);
// Export router taaki server.js me use ho sake
export default bookingRouter;
