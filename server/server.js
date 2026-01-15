// =====================
// 1️⃣ Basic imports
// =====================

// Express use hota hai server banane ke liye
import express from "express";

// CORS frontend (React) ko backend se baat karne deta hai
import cors from "cors";

// .env file ko load karta hai (keys, DB URL, etc.)
import "dotenv/config";

// MongoDB connect karne wala function
import connectDB from "./configs/db.js";

// Clerk middleware – user login / authentication ke liye
import { clerkMiddleware } from "@clerk/express";

// Inngest – background jobs (email, async kaam)
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";

// =====================
// 2️⃣ Routes imports
// =====================

// Movie / Show related routes
import showRouter from "./routes/showRoutes.js";

// Booking related routes
import bookingRouter from "./routes/bookingRoutes.js";

// Admin related routes
import adminRouter from "./routes/adminRoutes.js";

// User related routes
import userRouter from "./routes/userRoutes.js";


// import { stripeWebhooks } from "./controllers/stripeWebhooks.js";


//  App create


// Express app banaya
const app = express();

// Backend port
const port = 3000;

// =====================
// 4️⃣ Database connect
// =====================

// Server start hone se pehle DB connect karna zaroori hai
await connectDB();

// =====================
// 5️⃣ Stripe webhook (PAYMENT PART – SKIPPED)
// =====================

// Stripe special raw data bhejta hai isliye express.raw use hota hai
// ❌ Abhi payment nahi kar rahe, isliye comment rakha

// app.use(
//   "/api/stripe",
//   express.raw({ type: "application/json" }),
//   stripeWebhooks
// );

// =====================
// 6️⃣ Global Middlewares
// =====================

// Frontend se aane wale JSON data ko read karne ke liye
app.use(express.json());

// React aur backend ke beech connection allow karta hai
app.use(cors());

// Clerk auth – har request ke saath user ka auth data attach karta hai
app.use(clerkMiddleware());



// Server live hai ya nahi check karne ke liye
app.get("/", (req, res) => {
  res.send("Server is Live!");
});

// =====================
// 8️⃣ Inngest route
// =====================

// Background jobs ke liye endpoint
app.use("/api/inngest", serve({ client: inngest, functions }));

// =====================
// 9️⃣ Main API routes
// =====================

// Show / movie related APIs
app.use("/api/show", showRouter);

// Ticket booking related APIs
app.use("/api/booking", bookingRouter);

// Admin dashboard related APIs
app.use("/api/admin", adminRouter);

// User profile / user data related APIs
app.use("/api/user", userRouter);


//  Server start


// Server ko port par listen karne bol diya
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
