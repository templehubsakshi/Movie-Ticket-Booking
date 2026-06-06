import { Navigate, useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import Loading from "./Loading";

/**
 * Wraps routes that require a logged-in user.
 *
 * sessionRestored ref in AppContext ensures /api/auth/me is called once on
 * mount. While that request is in flight, user is null — we show a spinner
 * instead of immediately redirecting to /login.
 *
 * We detect "still loading" by checking whether the /me request has finished:
 * if sessionRestored.current is true but user is still null after the request,
 * the user is genuinely not logged in. We track this with a small isRestoring
 * state exposed from context — but the simplest equivalent is a brief
 * loading window tied to the /me call settling, which AppContext handles via
 * its own useEffect. For practical purposes: show Loading if user is null and
 * we haven't confirmed they're logged out yet.
 *
 * Since AppContext fires /me on every mount and sets user synchronously on
 * success, the only time user is null mid-session is during that initial
 * fetch. The spinner covers that window.
 */
export const ProtectedRoute = ({ children }) => {
  const { user, isRestoring } = useAppContext();
  const location = useLocation();

  // Still waiting for /api/auth/me to return
  if (isRestoring) return <Loading />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
};

/**
 * Wraps routes that require isAdmin === true.
 */
export const AdminRoute = ({ children }) => {
  const { user, isAdmin, isAdminLoading, isRestoring } = useAppContext();
  const location = useLocation();

  if (isRestoring) return <Loading />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (isAdminLoading) return <Loading />;

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
};
