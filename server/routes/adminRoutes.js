import express from "express";
import { protectAdmin } from "../middleware/auth.js";
// protectAdmin check karta hai → user admin hai ya nahi

import {
  getAllBookings,
  getAllShows,
  getDashboardData,
  isAdmin,
} from "../controllers/adminController.js";
// ye sab functions adminController file se aa rahe hain

const adminRouter = express.Router();
// express ka router bana rahe hain sirf admin ke liye

// --------------------
// Check: user admin hai ya nahi
// --------------------
// frontend ye route hit karta hai
// agar protectAdmin pass ho gaya matlab user admin hai
adminRouter.get("/is-admin", protectAdmin, isAdmin);

// --------------------
// Dashboard data (admin panel)
// --------------------
// total bookings, revenue, users, active shows
adminRouter.get("/dashboard", protectAdmin, getDashboardData);

// --------------------
// Admin ko saare upcoming shows dikhane ke liye
// --------------------
adminRouter.get("/all-shows", protectAdmin, getAllShows);

// --------------------
// Admin ko saari bookings dikhane ke liye
// --------------------
adminRouter.get("/all-bookings", protectAdmin, getAllBookings);

export default adminRouter;
