import axios from "axios";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import { inngest } from "../inngest/index.js";

// -----------------------
// Get now playing movies from TMDB API
// URL: GET /api/show/now-playing
// Source: TMDB API → data.results contains movies array
// Admin protected
// -----------------------
export const getNowPlayingMovies = async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://api.themoviedb.org/3/movie/now_playing",
      {
        headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
      }
    );

    const movies = data.results; // Array of movies from TMDB
    res.json({ success: true, movies: movies });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// -----------------------
// Add new show(s) to the database
// URL: POST /api/show/add
// Source: Admin frontend sends movieId, showsInput (dates + times), showPrice
// Logic:
// 1. Check if movie exists in DB
// 2. If not → fetch from TMDB API and create movie in DB
// 3. Loop through showsInput → create multiple Show documents
// 4. Initialize occupiedSeats = {} (empty)
// 5. Bulk insert shows in DB
// 6. Return success message
// -----------------------
export const addShow = async (req, res) => {
  try {
    const { movieId, showsInput, showPrice } = req.body;

    let movie = await Movie.findById(movieId); // Check DB

    if (!movie) {
      // Movie not in DB → fetch details & credits from TMDB
      const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
        }),
        axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
        }),
      ]);

      const movieApiData = movieDetailsResponse.data;
      const movieCreditsData = movieCreditsResponse.data;

      const movieDetails = {
        _id: movieId, // Ensure unique ID same as TMDB ID
        title: movieApiData.title,
        overview: movieApiData.overview,
        poster_path: movieApiData.poster_path,
        backdrop_path: movieApiData.backdrop_path,
        genres: movieApiData.genres,
        casts: movieCreditsData.cast,
        release_date: movieApiData.release_date,
        original_language: movieApiData.original_language,
        tagline: movieApiData.tagline || "",
        vote_average: movieApiData.vote_average,
        runtime: movieApiData.runtime,
      };

      movie = await Movie.create(movieDetails); // Save movie in DB
    }

    // -----------------------
    // Prepare shows to create in DB
    // Each show = movieId + showDateTime + showPrice + empty occupiedSeats
    // -----------------------
    const showsToCreate = [];
    showsInput.forEach((show) => {
      const showDate = show.date; // from frontend
      show.time.forEach((time) => {
        const dateTimeString = `${showDate}T${time}`; // convert date + time → ISO string
        showsToCreate.push({
          movie: movieId, // reference
          showDateTime: new Date(dateTimeString), // Date object for sorting/filter
          showPrice,
          occupiedSeats: {}, // initially empty
        });
      });
    });

    if (showsToCreate.length > 0) {
      await Show.insertMany(showsToCreate); // Bulk insert to DB
    }

    res.json({ success: true, message: "Show Added successfully." });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// -----------------------
// Get all upcoming shows
// URL: GET /api/show/all
// Source: MongoDB Show collection
// Logic: Find shows with date >= today, populate movie, sort by time
// -----------------------
export const getShows = async (req, res) => {
  try {
    const shows = await Show.find({ showDateTime: { $gte: new Date() } })
      .populate("movie") // replace movie field with full Movie object
      .sort({ showDateTime: 1 });

    // Unique shows by movie
    const uniqueShows = new Set(shows.map((show) => show.movie));

    res.json({ success: true, shows: Array.from(uniqueShows) });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// -----------------------
// Get single movie's upcoming shows
// URL: GET /api/show/:movieId
// Source: Show + Movie collections
// Logic:
// 1. Fetch upcoming shows for movieId
// 2. Build dateTime object = { "2025-12-21": [{time, showId}, ...] }
// 3. Return movie info + dateTime for frontend calendar
// -----------------------
export const getShow = async (req, res) => {
  try {
    const { movieId } = req.params;

    const shows = await Show.find({
      movie: movieId,
      showDateTime: { $gte: new Date() },
    });

    const movie = await Movie.findById(movieId);

    const dateTime = {};
    shows.forEach((show) => {
      const date = show.showDateTime.toISOString().split("T")[0]; // extract YYYY-MM-DD
      if (!dateTime[date]) dateTime[date] = [];
      dateTime[date].push({ time: show.showDateTime, showId: show._id });
    });

    res.json({ success: true, movie, dateTime });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
