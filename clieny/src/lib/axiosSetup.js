/**
 * Axios CSRF interceptor setup.
 *
 * How it works (Double Submit Cookie):
 *  1. After login/register the server sets a readable (non-HttpOnly) cookie
 *     named "csrf_token" alongside the HttpOnly "auth_token" cookie.
 *  2. This interceptor reads "csrf_token" from document.cookie before every
 *     state-changing request and attaches it as the X-CSRF-Token header.
 *  3. The server middleware (configs/csrf.js) compares header === cookie.
 *     A cross-origin attacker cannot read the cookie (Same-Origin Policy),
 *     so they cannot forge the header.
 *
 * GET / HEAD / OPTIONS are safe methods — no CSRF token needed.
 */

const SAFE_METHODS = ["get", "head", "options"];

/** Read a cookie value by name from document.cookie. */
const getCookie = (name) => {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
};

/** Attach to an axios instance. Call once at app startup. */
export const attachCSRFInterceptor = (axiosInstance) => {
  axiosInstance.interceptors.request.use((config) => {
    if (!SAFE_METHODS.includes(config.method?.toLowerCase())) {
      const token = getCookie("csrf_token");
      if (token) {
        config.headers["X-CSRF-Token"] = token;
      }
    }
    return config;
  });
};
