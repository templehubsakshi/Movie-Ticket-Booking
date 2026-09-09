// Shared constants — import from here to avoid duplication across files.

// Cookie name used for JWT auth token.
// LOW-02: was duplicated in auth.js and authController.js — now single source of truth.
export const COOKIE_NAME = "auth_token";

// Seat-id allowlist — rows A-J, columns 1-9. Shared by bookingController and
// groupBookingController so both stay in sync with the seat grid rendered in
// SeatLayout.jsx (SEAT_COLS = 9, rows A-J). Previously only lived inside
// bookingController.js; centralized here once a second controller needed it.
export const SEAT_RE = /^[A-J][1-9]$/;

// ── Group booking tuning ────────────────────────────────────────────────────
// GROUP-01: group bookings get a longer hold than a solo booking (45 min vs
// the 31-minute Stripe session window used for solo bookings) because payment
// now requires *multiple* people to individually check out, not just one.
// Longer hold = fewer accidental expiries mid-flow, but it also means the
// seats are unavailable to everyone else for longer. That trade-off is the
// crux of the whole feature, which is why it's a named constant instead of a
// buried magic number.
export const GROUP_BOOKING_EXPIRY_MINUTES = 45;

// A group booking is for more than one person by definition; cap it well
// above a solo booking's 5-seat limit but not unbounded.
export const GROUP_BOOKING_MAX_SEATS = 10;

// GROUP-05: when the timer hits and the group is a MIX of paid + unpaid
// seats, we don't auto-resolve — we give the organizer this long to choose
// "continue with who's paid" or "extend". If they never respond, the
// decision-timeout job in inngest/index.js defaults to "continue", because
// that option never requires refunding anyone.
export const GROUP_DECISION_GRACE_MINUTES = 15;

// How long a single "extend" adds, and how many times it can be used. Capped
// so a group can't hold seats hostage from the rest of the venue indefinitely.
// How long a per-person claim (seat picked but not yet paid) is held before
// it's automatically reverted to 'unclaimed' and freed up for another friend.
// This is independent of the group's own expiresAt — without it, one person
// claiming a seat and then going quiet would block that seat for the entire
// group window (up to 45+15 min), not just their own hold.
export const GROUP_CLAIM_HOLD_MINUTES = 10;

export const GROUP_EXTENSION_MINUTES = 15;
export const GROUP_MAX_EXTENSIONS = 1;
