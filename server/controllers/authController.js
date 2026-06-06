import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { COOKIE_NAME } from "../configs/constants.js";
import { setCSRFCookie, clearCSRFCookie } from "../configs/csrf.js";

// ─── Cookie config ─────────────────────────────────────────────────────────────
// Issue 1 fix: sameSite:"strict" breaks cross-domain cookie sending in production.
// When frontend (e.g. quickshow.vercel.app) and backend (quickshow-api.vercel.app)
// are on different domains, the browser won't send a "strict" cookie on
// cross-origin requests — login succeeds but every protected API call gets 401.
//
// Fix: use sameSite:"none" + secure:true in production (cross-domain safe).
// This requires CSRF protection (see configs/csrf.js) to prevent CSRF attacks.
//
// Issue 2 fix: CSRF token is set alongside the auth cookie via setCSRFCookie().
const cookieOptions = () => ({
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
});

// ─── Helper: sign a JWT ────────────────────────────────────────────────────────
const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// ─── POST /api/auth/register ───────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashedPassword });

    const token = signToken(user._id.toString());
    res.cookie(COOKIE_NAME, token, cookieOptions());
    // Issue 2: set readable CSRF token cookie alongside auth cookie
    setCSRFCookie(res);

    return res.status(201).json({
      success: true,
      user: {
        _id:     user._id,
        name:    user.name,
        email:   user.email,
        image:   user.image,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("register error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/auth/login ──────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = signToken(user._id.toString());
    res.cookie(COOKIE_NAME, token, cookieOptions());
    // Issue 2: set readable CSRF token cookie alongside auth cookie
    setCSRFCookie(res);

    return res.json({
      success: true,
      user: {
        _id:     user._id,
        name:    user.name,
        email:   user.email,
        image:   user.image,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("login error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/auth/logout ─────────────────────────────────────────────────────
export const logout = (req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  // Issue 2: clear CSRF cookie too
  clearCSRFCookie(res);
  return res.json({ success: true, message: "Logged out" });
};

// ─── GET /api/auth/me ──────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json({ success: true, user });
  } catch (error) {
    console.error("getMe error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
