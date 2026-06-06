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
export const updateFavorite = async (req, res) => {
  try {
    const { movieId } = req.body;
    if (!movieId) return res.status(400).json({ success: false, message: "movieId is required" });

    const movieIdStr = String(movieId);

    // HIGH-08 fix: verify the movie actually exists before adding to favorites.
    const movieExists = await Movie.exists({ _id: movieIdStr });
    if (!movieExists) {
      return res.status(404).json({ success: false, message: "Movie not found." });
    }

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

    const movies = await Movie.find({ _id: { $in: user.favorites } });
    res.json({ success: true, movies });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/user/update-profile — update name and/or image URL
export const updateProfile = async (req, res) => {
  try {
    const { name, image } = req.body;
    if (!name && !image) {
      return res.status(400).json({ success: false, message: "name or image is required" });
    }

    // HIGH-05 fix: trim name and reject whitespace-only or too-long strings.
    // Previously " ".trim() === "" would silently wipe the user's name.
    let trimmedName;
    if (name !== undefined) {
      trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ success: false, message: "Name cannot be empty or whitespace." });
      }
      if (trimmedName.length > 100) {
        return res.status(400).json({ success: false, message: "Name too long (max 100 characters)." });
      }
    }

    // Validate image URL — must be a valid https:// URL.
    if (image) {
      try {
        const parsed = new URL(image.trim());
        if (parsed.protocol !== "https:") {
          return res.status(400).json({ success: false, message: "Image URL must use HTTPS." });
        }
      } catch {
        return res.status(400).json({ success: false, message: "Invalid image URL." });
      }
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (trimmedName) user.name  = trimmedName;
    if (image)       user.image = image.trim();

    await user.save();
    res.json({
      success: true,
      message: "Profile updated",
      user: { _id: user._id, name: user.name, image: user.image, email: user.email, isAdmin: user.isAdmin },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
