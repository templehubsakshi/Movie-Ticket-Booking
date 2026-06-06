import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { COOKIE_NAME } from "../configs/constants.js";

// ─── Helper: extract + verify JWT from HttpOnly cookie ────────────────────────
// Returns decoded payload or null. Sends the 401 response itself on failure.
// CRIT-05 note: extractToken only sends a response on failure; callers must
// check the return value and not send a second response.
const extractToken = (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ success: false, message: "Not authorized — no token" });
    return null;
  }
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401).json({ success: false, message: "Not authorized — invalid token" });
    return null;
  }
};

// ─── Protect any authenticated route ──────────────────────────────────────────
export const protectRoute = (req, res, next) => {
  const decoded = extractToken(req, res);
  if (!decoded) return;
  req.userId = decoded.userId;
  next();
};

// ─── Protect admin-only routes ─────────────────────────────────────────────────
export const protectAdmin = async (req, res, next) => {
  const decoded = extractToken(req, res);
  if (!decoded) return;

  try {
    const user = await User.findById(decoded.userId).select("isAdmin");
    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized — admin only" });
    }
    req.userId = decoded.userId;
    next();
  } catch (error) {
    // CRIT-05 fix: return 500 for DB errors, not a misleading 401 "invalid token"
    return res.status(500).json({ success: false, message: "Authorization check failed." });
  }
};
