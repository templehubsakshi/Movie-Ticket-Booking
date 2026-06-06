import mongoose from "mongoose";

const movieSchema = new mongoose.Schema(
  {
    _id:               { type: String, required: true },
    title:             { type: String, required: true },
    overview:          { type: String, required: true },
    poster_path:       { type: String, required: true },
    backdrop_path:     { type: String, required: true },
    // BUG FIX: pehle Array type tha — TMDB string bhejta hai, array nahi
    release_date:      { type: String, required: true },
    original_language: { type: String },
    tagline:           { type: String, default: "" },
    genres:            { type: Array, required: true },
    casts:             { type: Array, required: true },
    // BUG FIX: comment galat tha "duration in minutes" — yeh vote average hai
    vote_average:      { type: Number, required: true },
    runtime:           { type: Number, required: true },
  },
  { timestamps: true }
);

// IMPROVEMENT: indexes for faster queries
movieSchema.index({ title: 1 });

const Movie = mongoose.model("Movie", movieSchema);
export default Movie;
