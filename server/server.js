import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import "dotenv/config";
import connectDB from "./configs/db.js";
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";
import showRouter    from "./routes/showRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import adminRouter   from "./routes/adminRoutes.js";
import userRouter    from "./routes/userRoutes.js";
import authRouter    from "./routes/authRoutes.js";
import { stripeWebhooks } from "./controllers/stripeWebhooks.js";
import { csrfProtect } from "./configs/csrf.js";

const app  = express();
const port = process.env.PORT || 3000;

await connectDB();

// ── 1. Stripe Webhooks ─────────────────────────────────────────────────────────
// MUST be registered FIRST — before helmet, cors, express.json(), cookieParser.
// Reasons:
//   a) Stripe sends raw Buffer body; express.json() would parse + destroy it.
//   b) Stripe's origin is null/stripe.com — CORS allowedHeaders don't apply.
//   c) helmet CSP headers are irrelevant for a server-to-server POST.
// express.raw() buffers the raw body so stripe.webhooks.constructEvent() can
// verify the HMAC signature correctly.
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhooks
);

// ── 2. Security headers (helmet) ──────────────────────────────────────────────
app.use(helmet());

// ── 3. CORS ───────────────────────────────────────────────────────────────────
// credentials: true is required so the browser sends the HttpOnly auth cookie
// and the readable csrf_token cookie on cross-origin requests.
const rawOrigins   = process.env.ALLOWED_ORIGINS || "http://localhost:5173";
const allowedOrigins = rawOrigins.split(",").map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server (no Origin header) and whitelisted origins.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    methods:      ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    // X-CSRF-Token is needed for CSRF protection (configs/csrf.js).
    // Content-Type is needed for JSON bodies.
    allowedHeaders: ["Content-Type", "X-CSRF-Token"],
    credentials: true,
  })
);

// ── 4. Body parsers + cookie parser ───────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// ── 5. CSRF protection ────────────────────────────────────────────────────────
// Must come after cookieParser() (reads csrf_token cookie) and after the
// Stripe webhook route (which is exempt — see configs/csrf.js).
// Rejects any state-changing request (POST/PUT/DELETE) without a valid
// X-CSRF-Token header that matches the csrf_token cookie.
app.use(csrfProtect);

// ── 6. Rate limiting ──────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again in 15 minutes." },
});

// ── 7. Routes ─────────────────────────────────────────────────────────────────
app.get("/",            (req, res) => res.send("Server is Live!"));
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/auth",    authLimiter, authRouter);
app.use("/api/show",    showRouter);
app.use("/api/booking", bookingRouter);
app.use("/api/admin",   adminRouter);
app.use("/api/user",    userRouter);

// ── 8. 404 ────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// ── 9. Global error handler ───────────────────────────────────────────────────
// Express recognises a 4-argument function as an error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong."
        : err.message,
  });
});

app.listen(port, () =>
  console.log(`Server listening at http://localhost:${port}`)
);
