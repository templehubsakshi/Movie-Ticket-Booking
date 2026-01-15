import express from "express";
import {
  addShow,
  getNowPlayingMovies,
  getShow,
  getShows,
} from "../controllers/showController.js";
import { protectAdmin } from "../middleware/auth.js";

const showRouter = express.Router();

// -----------------------
// Get all now playing movies from TMDB API
// Admin only route → protectAdmin ensures only admin can access
// URL: GET /api/show/now-playing
// Controller: getNowPlayingMovies
// Source: TMDB API
// -----------------------
showRouter.get("/now-playing", protectAdmin, getNowPlayingMovies);

// -----------------------
// Add new show(s) to the database
// Admin only route → protectAdmin ensures only admin can access
// URL: POST /api/show/add
// Controller: addShow
// Source: Admin frontend sends movieId, showsInput, showPrice
// -----------------------
showRouter.post("/add", protectAdmin, addShow);

// -----------------------
// Get all upcoming shows from DB
// Public route → anyone can fetch
// URL: GET /api/show/all
// Controller: getShows
// Source: MongoDB Show collection, populated with Movie details
// -----------------------
showRouter.get("/all", getShows);

// -----------------------
// Get a single movie's upcoming shows
// Public route → anyone can fetch
// URL: GET /api/show/:movieId
// Controller: getShow
// Source: MongoDB Show + Movie collections
// -----------------------
showRouter.get("/:movieId", getShow);

export default showRouter;
