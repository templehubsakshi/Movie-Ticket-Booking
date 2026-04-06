import { inngest } from "../inngest/index.js"; // Background job scheduler
import Booking from "../models/Booking.js"; // Booking collection in MongoDB
import Show from "../models/Show.js"; // Show collection in MongoDB
import stripe from "stripe"; // Payment library, abhi comment karenge

// Function to check if selected seats are available
// showId → req.body from frontend
// selectedSeats → array from frontend (selected seats)
const checkSeatsAvailability = async (showId, selectedSeats) => {
  try {
    // Fetch show details from DB
    const showData = await Show.findById(showId); 
    if (!showData) return false; // Show not found

    // Get already booked seats
    const occupiedSeats = showData.occupiedSeats;

    // Check if any selected seat is already booked
    const isAnySeatTaken = selectedSeats.some((seat) => occupiedSeats[seat]);

    // True → seats available, False → at least one seat taken
    return !isAnySeatTaken;
  } catch (error) {
    console.log(error.message);
    return false;
  }
};

// ===================== CREATE BOOKING =====================
export const createBooking = async (req, res) => {
  try {
    // -----------------------------
    // Data from frontend / auth
    // -----------------------------
    const userId = req.userId; // Set by protectRoute middleware
    const { showId, selectedSeats } = req.body; 
    // POST body → { showId, selectedSeats: ["A1", "A2"] }
    const { origin } = req.headers; 
    // Frontend origin URL → redirect/payment links

    // -----------------------------
    // Check seat availability
    // -----------------------------
    const isAvailable = await checkSeatsAvailability(showId, selectedSeats);
    if (!isAvailable) {
      return res.json({
        success: false,
        message: "Selected Seats are not available.",
      });
    }

    // -----------------------------
    // Get show details including movie info
    // -----------------------------
    const showData = await Show.findById(showId).populate("movie"); 
    // populate("movie") → Show model me movie field ObjectId hai
    // Populate se actual movie details fetch hote hain (title, poster etc.)

    // -----------------------------
    // Create new booking in DB
    // -----------------------------
    const booking = await Booking.create({
      user: userId, // logged-in user
      show: showId, // show reference
      amount: showData.showPrice * selectedSeats.length, // total price
      bookedSeats: selectedSeats, // array of seat numbers
    });

    // -----------------------------
    // Update Show model with booked seats
    // -----------------------------
    selectedSeats.map((seat) => {
      showData.occupiedSeats[seat] = userId; 
      // key = seat number, value = who booked
    });

    showData.markModified("occupiedSeats"); 
    // Important → mongoose nested object change
    await showData.save(); // Save changes to DB

    // -----------------------------
    // STRIPE PAYMENT (Commented for now)
    // -----------------------------

    // Create Stripe instance
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    // Define items for payment
    const line_items = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: showData.movie.title, // Movie title from populated show
          },
          unit_amount: Math.floor(booking.amount) * 100, 
          // Stripe expects cents
        },
        quantity: 1,
      },
    ];

    // Create Stripe checkout session
    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/loading/my-bookings`,
      // Redirect on success
      cancel_url: `${origin}/my-bookings`,
      // Redirect on cancel
      line_items: line_items,
      mode: "payment", // one-time payment
      metadata: { bookingId: booking._id.toString() },
      // Link booking with Stripe session
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      // 30 minutes expiry
    });

    // Save payment link in Booking document
    booking.paymentLink = session.url;
    await booking.save();
res.json({ success: true, url: session.url });
    // Schedule background job to check payment after 10 minutes
    await inngest.send({
      name: "app/checkpayment",
      data: { bookingId: booking._id.toString() },
    });
   

    // -----------------------------
    // Response to frontend
    // -----------------------------
    // res.json({ success: true, message: "Booking created successfully." });

  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ===================== GET OCCUPIED SEATS =====================
export const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params; 
    // URL parameter → GET /api/booking/seats/:showId

    const showData = await Show.findById(showId);

    const occupiedSeats = Object.keys(showData.occupiedSeats); 
    // Only keys → seat numbers booked

    res.json({ success: true, occupiedSeats });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
