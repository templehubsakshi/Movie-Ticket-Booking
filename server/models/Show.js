import mongoose from "mongoose";

const showSchema = new mongoose.Schema(
  {
    movie:        { type: String, required: true, ref: "Movie" },
    showDateTime: {
      type:     Date,
      required: true,
      // HIGH-04 fix: reject past showtimes at schema level as a safety net.
      // addShow controller also validates this, but a schema validator provides
      // defense-in-depth (e.g., direct DB writes via scripts).
      validate: {
        validator: (v) => v > new Date(),
        message:   "showDateTime must be in the future.",
      },
    },
    showPrice:    { type: Number, required: true },
    // Map type: Mongoose tracks mutations automatically — no markModified needed.
    // format: seat key (e.g. "A1") → userId string
    occupiedSeats: { type: Map, of: String, default: {} },
  },
  { minimize: false }
);

showSchema.index({ showDateTime: 1 });
// HIGH-03 fix: unique compound index prevents duplicate {movie, showDateTime} pairs.
showSchema.index({ movie: 1, showDateTime: 1 }, { unique: true });

const Show = mongoose.model("Show", showSchema);
export default Show;
