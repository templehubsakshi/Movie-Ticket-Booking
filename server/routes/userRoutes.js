import express from "express";
import {
  getFavorites,
  getUserBookings,
  updateFavorite,
} from "../controllers/userController.js";

const userRouter = express.Router();

// logged-in user apni bookings dekh sakta hai
// yaha userId req.auth() se aata hai
userRouter.get("/bookings", getUserBookings);

// user kisi movie ko favorite / unfavorite karta hai
// movieId req.body se aata hai
userRouter.post("/update-favorite", updateFavorite);

// user apni favorite movies ki list dekh sakta hai
userRouter.get("/favorites", getFavorites);

export default userRouter;
