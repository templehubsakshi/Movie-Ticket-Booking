import express from "express";
import {
  createGroupBooking,
  getGroupBooking,
  claimSeats,
  payForClaimedSeats,
  decideGroupBooking,
} from "../controllers/groupBookingController.js";
import { protectRoute } from "../middleware/auth.js";

const groupBookingRouter = express.Router();

// All group-booking routes require a logged-in user — there's no anonymous
// claiming, since a claim has to be attributable to a real user for payment.
groupBookingRouter.post("/create", protectRoute, createGroupBooking);
groupBookingRouter.get("/:code", protectRoute, getGroupBooking);
groupBookingRouter.post("/:code/claim", protectRoute, claimSeats);
groupBookingRouter.post("/:code/pay", protectRoute, payForClaimedSeats);
groupBookingRouter.post("/:code/decide", protectRoute, decideGroupBooking);

export default groupBookingRouter;
