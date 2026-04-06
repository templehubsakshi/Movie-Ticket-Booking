import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    image:    { type: String, default: "" },
    isAdmin:  { type: Boolean, default: false },
    // Movie._id is a String (TMDB numeric ID stored as string), so ref must be String too
    favorites: [{ type: String, ref: "Movie" }],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
