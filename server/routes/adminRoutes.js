import express from "express";
import { protectAdmin } from "../middleware/auth.js";
import {
  isAdmin,
  getDashboardData,
  getAllShows,
  getAllBookings,
  getAllUsers,
  toggleUserAdmin,
} from "../controllers/adminController.js";

const adminRouter = express.Router();

// Sab routes protectAdmin se guard hain — sirf admins access kar sakte hain

adminRouter.get("/is-admin",    protectAdmin, isAdmin);
adminRouter.get("/dashboard",   protectAdmin, getDashboardData);
adminRouter.get("/all-shows",   protectAdmin, getAllShows);
adminRouter.get("/all-bookings",protectAdmin, getAllBookings);

// NEW: User management routes
adminRouter.get("/users",                        protectAdmin, getAllUsers);
adminRouter.put("/users/:userId/toggle-admin",   protectAdmin, toggleUserAdmin);

export default adminRouter;
