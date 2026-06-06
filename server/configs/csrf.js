import crypto from "crypto";

export const CSRF_COOKIE = "csrf_token";

/** Generate and set a CSRF token cookie. Call after setting the auth cookie. */
export const setCSRFCookie = (res) => {
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,  // Must be readable by JS to put in X-CSRF-Token header
    secure:   process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });
  return token;
};

/** Clear the CSRF cookie on logout. */
export const clearCSRFCookie = (res) => {
  res.clearCookie(CSRF_COOKIE, {
    httpOnly: false,
    secure:   process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
};

/**
 * CSRF middleware — Double Submit Cookie pattern.
 * Rejects state-changing requests (POST/PUT/DELETE) without a valid
 * X-CSRF-Token header matching the csrf_token cookie.
 *
 * EXEMPT routes (no CSRF cookie exists yet or not a browser request):
 *  - GET/HEAD/OPTIONS  — safe methods
 *  - /api/auth/login   — no cookie yet before login
 *  - /api/auth/register — no cookie yet before register
 *  - /api/stripe       — server-to-server, Stripe signature handles auth
 *  - /api/inngest      — server-to-server
 */
export const csrfProtect = (req, res, next) => {
  const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];
  if (SAFE_METHODS.includes(req.method)) return next();

  // Exempt: no CSRF cookie exists before the user logs in
  if (req.path === "/api/auth/login")    return next();
  if (req.path === "/api/auth/register") return next();

  // Exempt: server-to-server calls (no browser cookie)
  if (req.path.startsWith("/api/stripe"))  return next();
  if (req.path.startsWith("/api/inngest")) return next();

  const tokenFromHeader = req.headers["x-csrf-token"];
  const tokenFromCookie = req.cookies?.[CSRF_COOKIE];

  if (!tokenFromHeader || !tokenFromCookie) {
    return res.status(403).json({ success: false, message: "CSRF token missing." });
  }

  // Constant-time comparison prevents timing attacks
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