import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/User.js";

// GET /api/admin/is-admin  — middleware already verified, just confirm
export const isAdmin = async (req, res) => {
  res.json({ success: true, isAdmin: true });
};

// GET /api/admin/dashboard
export const getDashboardData = async (req, res) => {
  try {
    const bookings    = await Booking.find({ isPaid: true });
    const activeShows = await Show.find({ showDateTime: { $gte: new Date() } })
      .populate("movie")
      .sort({ showDateTime: 1 });
    const totalUser   = await User.countDocuments();

    res.json({
      success: true,
      dashboardData: {
        totalBookings: bookings.length,
        totalRevenue:  bookings.reduce((acc, b) => acc + b.amount, 0),
        activeShows,
        totalUser,
      },
    });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// GET /api/admin/all-shows
export const getAllShows = async (req, res) => {
  try {
    const shows = await Show.find({ showDateTime: { $gte: new Date() } })
      .populate("movie")
      .sort({ showDateTime: 1 });
    res.json({ success: true, shows });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// GET /api/admin/all-bookings
// Handles legacy Clerk user IDs gracefully — old rows have user: "user_xxx"
// which can't be cast to ObjectId. We populate manually and fall back safely.
export const getAllBookings = async (req, res) => {
  try {
    // Fetch bookings + shows without populating user yet
    const bookings = await Booking.find({})
      .populate({ path: "show", populate: { path: "movie" } })
      .sort({ createdAt: -1 })
      .lean();

    // Manually resolve user for each booking — skip gracefully if ID is invalid
    const enriched = await Promise.all(
      bookings.map(async (booking) => {
        try {
          const user = await User.findById(booking.user).select("name email").lean();
          return { ...booking, user: user ?? { name: "Unknown User", email: "" } };
        } catch {
          // Old Clerk ID ("user_xxx") — can't cast to ObjectId, return placeholder
          return { ...booking, user: { name: "Legacy User", email: "" } };
        }
      })
    );

    res.json({ success: true, bookings: enriched });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
