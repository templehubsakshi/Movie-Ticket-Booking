import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/User.js";

/*
  -----------------------------
  CHECK ADMIN
  -----------------------------
  Ye API sirf ek simple check hai

  Route:
  GET /api/admin/is-admin

  Is route se pehle protectAdmin middleware lag chuka hota hai,
  matlab agar yaha tak aa gaya user → wo already admin hai
*/
export const isAdmin = async (req, res) => {
  // yaha koi DB call nahi
  // sirf frontend ko batana hai ki haan admin hai
  res.json({ success: true, isAdmin: true });
};

/*
  -----------------------------
  DASHBOARD DATA (ADMIN PANEL)
  -----------------------------
  Admin dashboard ke numbers yahi se aate hain:
  - total bookings
  - total revenue
  - active shows
  - total users
*/
export const getDashboardData = async (req, res) => {
  try {
    // sirf PAID bookings hi count ho rahi hain
    // unpaid bookings ignore ho jaati hain
    const bookings = await Booking.find({ isPaid: true });

    // aaj ke baad wali shows hi active maani jaati hain
    const activeShows = await Show.find({
      showDateTime: { $gte: new Date() },
    }).populate("movie");
    // populate("movie") ka matlab:
    // show.movie me sirf ID nahi
    // pura movie object aa jaata hai

    // total users count
    const totalUser = await User.countDocuments();

    // dashboard ke liye final data
    const dashboardData = {
      totalBookings: bookings.length,

      // revenue = saare paid bookings ka amount add
      totalRevenue: bookings.reduce(
        (acc, booking) => acc + booking.amount,
        0
      ),

      activeShows,
      totalUser,
    };

    res.json({ success: true, dashboardData });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

/*
  -----------------------------
  GET ALL SHOWS (ADMIN VIEW)
  -----------------------------
  Admin ko saare upcoming shows dikhane ke liye
*/
export const getAllShows = async (req, res) => {
  try {
    const shows = await Show.find({
      showDateTime: { $gte: new Date() },
    })
      .populate("movie") // movie ka full data
      .sort({ showDateTime: 1 }); // nearest show pehle

    res.json({ success: true, shows });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

/*
  -----------------------------
  GET ALL BOOKINGS (ADMIN VIEW)
  -----------------------------
  Admin ko saari bookings dekhni hoti hain:
  - kaun user
  - kaunsi movie
  - kaunsa show
*/
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      // user field ka pura data lao
      .populate("user")

      // show ke andar movie bhi lao
      .populate({
        path: "show",
        populate: { path: "movie" },
      })

      // latest booking pehle
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
