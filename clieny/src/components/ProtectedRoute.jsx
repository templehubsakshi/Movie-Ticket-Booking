import { Navigate, useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import Loading from "./Loading";

/**
 * Wraps routes that require a logged-in user.
 * Saves the attempted URL so after login the user is sent back there.
 */
export const ProtectedRoute = ({ children }) => {
  const { user, token } = useAppContext();
  const location = useLocation();

  // Token exists but user hasn't loaded yet (restoreSession in flight)
  if (token && !user) return <Loading />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
};

/**
 * Wraps routes that require isAdmin === true.
 * Non-admins are sent to the home page.
 */
export const AdminRoute = ({ children }) => {
  const { user, isAdmin, token } = useAppContext();
  const location = useLocation();

  if (token && !user) return <Loading />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
};
