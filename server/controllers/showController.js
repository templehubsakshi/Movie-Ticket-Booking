import axios from "axios";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import Booking from "../models/Booking.js";
import { inngest } from "../inngest/index.js";

// ── GET /api/show/now-playing ─────────────────────────────────────────────────
export const getNowPlayingMovies = async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://api.themoviedb.org/3/movie/now_playing",
      { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
    );
    return res.json({ success: true, movies: data.results });
  } catch (error) {
    console.error("getNowPlayingMovies error:", error.message);
    return res.status(500).json({ success: false, message: "Could not fetch movies." });
  }
};

// ── POST /api/show/add ────────────────────────────────────────────────────────
export const addShow = async (req, res) => {
  try {
    const { movieId, showsInput, showPrice } = req.body;

    if (!movieId || !showsInput?.length || !showPrice) {
      return res.status(400).json({ success: false, message: "movieId, showsInput and showPrice are required." });
    }

    // MED-09 fix: validate showPrice is a positive number.
    const price = Number(showPrice);
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ success: false, message: "showPrice must be a positive number." });
    }

    let movie = await Movie.findById(movieId);
    if (!movie) {
      const [detailsRes, creditsRes] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
        }),
        axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
        }),
      ]);

      const d = detailsRes.data;
      const c = creditsRes.data;

      movie = await Movie.create({
        _id:               movieId,
        title:             d.title,
        overview:          d.overview,
        poster_path:       d.poster_path,
        backdrop_path:     d.backdrop_path,
        genres:            d.genres,
        casts:             c.cast,
        release_date:      d.release_date,
        original_language: d.original_language,
        tagline:           d.tagline || "",
        vote_average:      d.vote_average,
        runtime:           d.runtime,
      });
    }

    // Build flat array of Show documents.
    const showsToCreate = [];
    const now = new Date();

    showsInput.forEach((show) => {
      show.time.forEach((time) => {
        const showDateTime = new Date(`${show.date}T${time}`);

        // HIGH-04 fix: reject shows in the past at the server level.
        if (showDateTime <= now) {
          console.warn(`Skipping past showtime: ${showDateTime.toISOString()}`);
          return;
        }

        showsToCreate.push({
          movie:         movieId,
          showDateTime,
          showPrice:     price,
          occupiedSeats: {},
        });
      });
    });

    if (showsToCreate.length === 0) {
      return res.status(400).json({ success: false, message: "All provided showtimes are in the past." });
    }

    // HIGH-03 fix: use insertMany with ordered:false and handle duplicate key errors
    // so that already-existing {movie, showDateTime} pairs are skipped gracefully.
    try {
      await Show.insertMany(showsToCreate, { ordered: false });
    } catch (err) {
      // 11000 = MongoDB duplicate key error code
      if (err.code !== 11000 && err.writeErrors?.some((e) => e.code !== 11000)) {
        throw err;
      }
      // Some or all were duplicates — still considered a success for any new ones inserted.
    }

    await inngest.send({
      name: "app/show.added",
      data: { movieTitle: movie.title },
    });

    return res.json({ success: true, message: "Show added successfully." });
  } catch (error) {
    console.error("addShow error:", error.message);
    return res.status(500).json({ success: false, message: "Could not add show." });
  }
};

// ── GET /api/show/all ─────────────────────────────────────────────────────────
export const getShows = async (req, res) => {
  try {
    const shows = await Show.find({ showDateTime: { $gte: new Date() } })
      .populate("movie")
      .sort({ showDateTime: 1 });

    const seen = new Set();
    const uniqueMovies = [];
    for (const show of shows) {
      if (!show.movie) continue;
      const id = show.movie._id.toString();
      if (!seen.has(id)) {
        seen.add(id);
        uniqueMovies.push(show.movie);
      }
    }

    // MED-02 note: field is named "shows" for API compatibility but contains
    // unique Movie documents (one per movie with upcoming shows).
    return res.json({ success: true, shows: uniqueMovies });
  } catch (error) {
    console.error("getShows error:", error.message);
    return res.status(500).json({ success: false, message: "Could not fetch shows." });
  }
};

// ── GET /api/show/:movieId ────────────────────────────────────────────────────
export const getShow = async (req, res) => {
  try {
    const { movieId } = req.params;

    const shows = await Show.find({
      movie: movieId,
      showDateTime: { $gte: new Date() },
    }).populate("movie");

    const movie = shows.length > 0 ? shows[0].movie : await Movie.findById(movieId);

    const dateTime = {};
    shows.forEach((show) => {
      const date = show.showDateTime.toISOString().split("T")[0];
      if (!dateTime[date]) dateTime[date] = [];
      dateTime[date].push({ time: show.showDateTime, showId: show._id });
    });

    return res.json({ success: true, movie, dateTime });
  } catch (error) {
    console.error("getShow error:", error.message);
    return res.status(500).json({ success: false, message: "Could not fetch show." });
  }
};

// ── DELETE /api/show/:showId ──────────────────────────────────────────────────
export const deleteShow = async (req, res) => {
  try {
    const { showId } = req.params;

    const show = await Show.findById(showId);
    if (!show) {
      return res.status(404).json({ success: false, message: "Show not found." });
    }

    // Delete orphaned bookings before removing the show to prevent null-ref crashes.
    await Booking.deleteMany({ show: showId });
    await Show.findByIdAndDelete(showId);

    return res.json({ success: true, message: "Show deleted successfully." });
  } catch (error) {
    console.error("deleteShow error:", error.message);
    return res.status(500).json({ success: false, message: "Could not delete show." });
  }
};
