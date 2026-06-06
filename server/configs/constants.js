// Shared constants — import from here to avoid duplication across files.

// Cookie name used for JWT auth token.
// LOW-02: was duplicated in auth.js and authController.js — now single source of truth.
export const COOKIE_NAME = "auth_token";
