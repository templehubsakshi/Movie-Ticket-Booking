import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    // IMPROVEMENT: select: false — password by default queries mein nahi aayega
    // Login mein explicitly .select("+password") use karo
    password: { type: String, required: true, minlength: 6, select: false },
    image:    { type: String, default: "" },
    isAdmin:  { type: Boolean, default: false },
    favorites: [{ type: String, ref: "Movie" }],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
