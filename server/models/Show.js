import mongoose from "mongoose";

const showSchema = new mongoose.Schema(
  {
    movie: { type: String, required: true, ref: "Movie" }, 
    // CURRENT: String type, works fine now
    // FUTURE: ObjectId recommended for populate("movie") to fetch full movie object

    showDateTime: { type: Date, required: true }, // show datetime
    showPrice: { type: Number, required: true }, // ticket price
    occupiedSeats: { type: Object, default: {} }, 
    // Format: { "A1": "userId", "A2": "userId" }
    // Updated dynamically → markModified required when updating keys
  },
  { minimize: false } // ensure empty objects stored
);

const Show = mongoose.model("Show", showSchema);

export default Show;

// -----------------------
// FUTURE NOTES:
// 1. movie field → ObjectId preferred for populate
// 2. occupiedSeats → dynamic updates require markModified
// 3. showDateTime → sorting, upcoming filter
// 4. Data flow:
//    - Admin frontend sends show details → controller → Show model → DB
//    - Booking controller updates occupiedSeats
//    - Frontend fetches shows + movie via getShows / getShow
// -----------------------
