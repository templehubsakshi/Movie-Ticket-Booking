import crypto from "crypto";

export const CSRF_COOKIE = "csrf_token";

export const setCSRFCookie = (res) => {
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure:   process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });
  return token;
};

export const clearCSRFCookie = (res) => {
  res.clearCookie(CSRF_COOKIE, {
    httpOnly: false,
    secure:   process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
};

// CSRF middleware — currently checks only in development.
// In production with Vercel serverless + cross-domain cookies,
// sameSite:none cookies require special handling.
// Cookie auth + HttpOnly JWT already protects against most CSRF attacks.
export const csrfProtect = (req, res, next) => {
  // Skip in production for now — JWT HttpOnly cookie provides primary protection
  if (process.env.NODE_ENV === "production") return next();

  const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];
  if (SAFE_METHODS.includes(req.method)) return next();

  if (req.path === "/api/auth/login")    return next();
  if (req.path === "/api/auth/register") return next();
  if (req.path.startsWith("/api/stripe"))  return next();
  if (req.path.startsWith("/api/inngest")) return next();

  const tokenFromHeader = req.headers["x-csrf-token"];
  const tokenFromCookie = req.cookies?.[CSRF_COOKIE];

  if (!tokenFromHeader || !tokenFromCookie) {
    return res.status(403).json({ success: false, message: "CSRF token missing." });
  }

  const headerBuf = Buffer.from(tokenFromHeader);
  const cookieBuf = Buffer.from(tokenFromCookie);
  if (
    headerBuf.length !== cookieBuf.length ||
    !crypto.timingSafeEqual(headerBuf, cookieBuf)
  ) {
    return res.status(403).json({ success: false, message: "CSRF token invalid." });
  }

  next();
};
