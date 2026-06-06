import express from "express";
import { getFavorites, getUserBookings, updateFavorite, updateProfile } from "../controllers/userController.js";
import { protectRoute } from "../middleware/auth.js";

const userRouter = express.Router();

// All user routes require a valid JWT
userRouter.get("/bookings", protectRoute, getUserBookings);
userRouter.post("/update-favorite", protectRoute, updateFavorite);
userRouter.get("/favorites", protectRoute, getFavorites);

userRouter.put("/update-profile", protectRoute, updateProfile);

export default userRouter;
