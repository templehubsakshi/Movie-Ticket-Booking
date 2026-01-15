import mongoose from "mongoose";

// User schema ka matlab: database me user ka structure kya hoga
// Ye user mainly Clerk se linked hota hai
const userSchema = new mongoose.Schema({
  // _id yaha Clerk ka userId hota hai
  // isliye type String rakha gaya
  _id: { type: String, required: true },

  // user ka naam (Clerk se aata hai)
  name: { type: String, required: true },

  // user ka email (Clerk se aata hai)
  email: { type: String, required: true },

  // profile image url (Clerk se aata hai)
  image: { type: String, required: true },
});

// User model banaya
// isi naam se baaki jagah ref ya import hota hai
const User = mongoose.model("User", userSchema);

export default User;
