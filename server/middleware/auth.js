import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ─── Protect any authenticated route ──────────────────────────────────────────
// Extracts userId from Bearer token and attaches it to req.userId
export const protectRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authorized — no token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Not authorized — invalid token" });
  }
};

// ─── Protect admin-only routes ─────────────────────────────────────────────────
// Runs after protectRoute (or independently) — checks isAdmin flag in DB
export const protectAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authorized — no token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("isAdmin");
    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized — admin only" });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Not authorized — invalid token" });
  }
};
