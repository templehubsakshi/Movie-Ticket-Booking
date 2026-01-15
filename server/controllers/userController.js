import { clerkClient } from "@clerk/express";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";

// user apni saari bookings dekhne ke liye
export const getUserBookings = async (req, res) => {
  try {
    // logged-in user ka id
    // ye Clerk middleware se automatically aata hai
    const user = req.auth().userId;

    // Booking collection me sirf isi user ki bookings nikal rahe hain
    const bookings = await Booking.find({ user })
      .populate({
        // booking ke andar showId hota hai
        // us show ka full data la rahe hain
        path: "show",
        populate: {
          // show ke andar movieId hota hai
          // us movie ka full data la rahe hain
          path: "movie",
        },
      })
      // latest booking upar dikhe
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};
// user kisi movie ko favorite ya unfavorite karta hai
export const updateFavorite = async (req, res) => {
  try {
    // frontend se movieId aata hai
    const { movieId } = req.body;

    // logged-in user ka id
    const userId = req.auth().userId;

    // Clerk se user ka data la rahe hain
    const user = await clerkClient.users.getUser(userId);

    // agar favorites pehle se exist nahi karta
    // toh empty array bana dete hain
    if (!user.privateMetadata.favorites) {
      user.privateMetadata.favorites = [];
    }

    // agar movie already favorite me nahi hai
    if (!user.privateMetadata.favorites.includes(movieId)) {
      // toh add kar do
      user.privateMetadata.favorites.push(movieId);
    } else {
      // agar already hai toh remove kar do
      user.privateMetadata.favorites =
        user.privateMetadata.favorites.filter(
          (item) => item !== movieId
        );
    }

    // updated metadata Clerk me save kar rahe hain
    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: user.privateMetadata,
    });

    res.json({ success: true, message: "Favorite movies updated" });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};
// user apni favorite movies ki list dekhna chahta hai
export const getFavorites = async (req, res) => {
  try {
    // Clerk se user ka data la rahe hain
    const user = await clerkClient.users.getUser(
      req.auth().userId
    );

    // favorites array Clerk metadata se aata hai
    const favorites = user.privateMetadata.favorites;

    // MongoDB se sirf wahi movies la rahe hain
    // jinki id favorites array me hai
    const movies = await Movie.find({
      _id: { $in: favorites },
    });

    res.json({ success: true, movies });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};
