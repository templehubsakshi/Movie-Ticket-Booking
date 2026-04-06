import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";
import User from "../models/User.js";

// GET /api/user/bookings  — logged-in user's own bookings
export const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.userId })
      .populate({ path: "show", populate: { path: "movie" } })
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/user/update-favorite  — toggle a movie in favorites
// movieId must be the Movie._id (String / TMDB ID), NOT the show's _id
export const updateFavorite = async (req, res) => {
  try {
    const { movieId } = req.body;
    if (!movieId) return res.status(400).json({ success: false, message: "movieId is required" });

    const movieIdStr = String(movieId); // ensure string — Movie._id is String type

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const idx = user.favorites.indexOf(movieIdStr);
    if (idx === -1) {
      user.favorites.push(movieIdStr);
    } else {
      user.favorites.splice(idx, 1);
    }

    await user.save();
    res.json({ success: true, message: "Favorite movies updated" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/user/favorites  — return full Movie documents for all favorited movies
export const getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // favorites is String[] of Movie._id values
    const movies = await Movie.find({ _id: { $in: user.favorites } });
    res.json({ success: true, movies });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
