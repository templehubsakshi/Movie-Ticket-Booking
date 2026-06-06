import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/User.js";
import mongoose from "mongoose";

// ── GET /api/admin/is-admin ────────────────────────────────────────────────────
export const isAdmin = (req, res) => {
  res.json({ success: true, isAdmin: true });
};

// ── GET /api/admin/dashboard ───────────────────────────────────────────────────
export const getDashboardData = async (req, res) => {
  try {
    const [bookings, activeShows, totalUser] = await Promise.all([
      Booking.find({ isPaid: true }),
      Show.find({ showDateTime: { $gte: new Date() } }).populate("movie").sort({ showDateTime: 1 }),
      User.countDocuments(),
    ]);

    return res.json({
      success: true,
      dashboardData: {
        totalBookings: bookings.length,
        totalRevenue:  bookings.reduce((acc, b) => acc + b.amount, 0),
        activeShows,
        totalUser,
      },
    });
  } catch (error) {
    console.error("getDashboardData error:", error.message);
    return res.status(500).json({ success: false, message: "Could not fetch dashboard data." });
  }
};

// ── GET /api/admin/all-shows ───────────────────────────────────────────────────
export const getAllShows = async (req, res) => {
  try {
    const shows = await Show.find({ showDateTime: { $gte: new Date() } })
      .populate("movie")
      .sort({ showDateTime: 1 });
    return res.json({ success: true, shows });
  } catch (error) {
    console.error("getAllShows error:", error.message);
    return res.status(500).json({ success: false, message: "Could not fetch shows." });
  }
};

// ── GET /api/admin/all-bookings ────────────────────────────────────────────────
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate({ path: "show", populate: { path: "movie" } })
      .sort({ createdAt: -1 })
      .lean();

    // Fix: some old bookings may have Clerk-format user IDs ("user_xxx") or
    // invalid ObjectIds — skip the User lookup for those instead of crashing.
    const validUserIds = [
      ...new Set(
        bookings
          .map((b) => b.user?.toString())
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
      ),
    ];

    const users = validUserIds.length
      ? await User.find({ _id: { $in: validUserIds } }).select("name email").lean()
      : [];

    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

    const enriched = bookings.map((booking) => {
      const uid = booking.user?.toString();
      return {
        ...booking,
        user: (uid && userMap[uid]) || { name: "Legacy/Unknown User", email: "" },
      };
    });

    return res.json({ success: true, bookings: enriched });
  } catch (error) {
    console.error("getAllBookings error:", error.message);
    return res.status(500).json({ success: false, message: "Could not fetch bookings." });
  }
};

// ── GET /api/admin/users ───────────────────────────────────────────────────────
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("name email isAdmin createdAt").sort({ createdAt: -1 });
    return res.json({ success: true, users });
  } catch (error) {
    console.error("getAllUsers error:", error.message);
    return res.status(500).json({ success: false, message: "Could not fetch users." });
  }
};

// ── PUT /api/admin/users/:userId/toggle-admin ──────────────────────────────────
export const toggleUserAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    if (String(userId) === String(req.userId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own admin status.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    user.isAdmin = !user.isAdmin;
    await user.save();

    return res.json({
      success: true,
      message: `${user.name} is now ${user.isAdmin ? "an admin" : "a regular user"}.`,
      user: { _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin },
    });
  } catch (error) {
    console.error("toggleUserAdmin error:", error.message);
    return res.status(500).json({ success: false, message: "Could not update user role." });
  }
};