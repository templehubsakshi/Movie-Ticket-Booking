import { createContext, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { attachCSRFInterceptor } from "../lib/axiosSetup.js";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

// All requests go to the backend with credentials (cookies) attached.
// withCredentials: true tells the browser to include the HttpOnly cookie
// on every cross-origin request.
axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;
axios.defaults.withCredentials = true;
attachCSRFInterceptor(axios); // attach CSRF token header on every mutating request

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser]                     = useState(null);
  const [isAdmin, setIsAdmin]               = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [shows, setShows]                   = useState([]);
  const [isShowsLoading, setIsShowsLoading] = useState(true);
  const [favoriteMovies, setFavoriteMovies] = useState([]);
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(false);
  // true while /api/auth/me is in-flight on first load — ProtectedRoute shows
  // a spinner instead of flashing a login redirect.
  const [isRestoring, setIsRestoring]       = useState(true);

  const image_base_url = import.meta.env.VITE_TMDB_IMAGE_BASE_URL;
  const navigate       = useNavigate();

  const sessionRestored = useRef(false);

  // ── Login helper ─────────────────────────────────────────────────────────────
  const login = (userData) => {
    setUser(userData);
  };

  // ── Logout helper ─────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await axios.post("/api/auth/logout");
    } catch {
      // Even if the request fails, clear local state so the UI resets.
    }
    setUser(null);
    setIsAdmin(false);
    setFavoriteMovies([]);
    navigate("/");
    toast.success("Logged out successfully");
  };

  // ── App load: restore session from cookie ──────────────────────────────────
  useEffect(() => {
    if (sessionRestored.current) return;
    sessionRestored.current = true;

    axios
      .get("/api/auth/me")
      .then(({ data }) => {
        if (data.success) setUser(data.user);
      })
      .catch(() => {
        // 401 or network error — user stays null, not logged in.
      })
      .finally(() => {
        setIsRestoring(false);
      });
  }, []);

  // ── Admin check ───────────────────────────────────────────────────────────────
  // HIGH-09 fix: use window.location.pathname inside the async function so we
  // always read the CURRENT path, not a stale closure value from render time.
  const fetchIsAdmin = async () => {
    try {
      setIsAdminLoading(true);
      const { data } = await axios.get("/api/admin/is-admin");
      setIsAdmin(!!data.isAdmin);
      if (!data.isAdmin && window.location.pathname.startsWith("/admin")) {
        navigate("/");
        toast.error("You are not authorized to access the admin dashboard");
      }
    } catch {
      setIsAdmin(false);
    } finally {
      setIsAdminLoading(false);
    }
  };

  // ── Shows fetch ───────────────────────────────────────────────────────────────
  const fetchShows = async () => {
    try {
      setIsShowsLoading(true);
      const { data } = await axios.get("/api/show/all");
      if (data.success) setShows(data.shows);
      else toast.error(data.message);
    } catch (error) {
      console.error(error);
    } finally {
      setIsShowsLoading(false);
    }
  };

  // ── Favorites fetch ───────────────────────────────────────────────────────────
  const fetchFavoriteMovies = async () => {
    try {
      setIsFavoritesLoading(true);
      const { data } = await axios.get("/api/user/favorites");
      if (data.success) setFavoriteMovies(data.movies);
      else toast.error(data.message);
    } catch (error) {
      console.error(error);
    } finally {
      setIsFavoritesLoading(false);
    }
  };

  useEffect(() => { fetchShows(); }, []);

  // LOW-05 fix: depend on user._id instead of the entire user object.
  // Previously, calling setUser(updatedUser) from Profile.jsx (e.g. after
  // changing display name) would re-trigger fetchIsAdmin + fetchFavoriteMovies
  // on every profile save — redundant network calls since the identity hasn't changed.
  useEffect(() => {
    if (user?._id) {
      fetchIsAdmin();
      fetchFavoriteMovies();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const value = {
    axios,
    user,
    setUser,
    isRestoring,
    login,
    logout,
    isAdmin,
    isAdminLoading,
    fetchIsAdmin,
    shows,
    isShowsLoading,
    favoriteMovies,
    isFavoritesLoading,
    fetchFavoriteMovies,
    image_base_url,
    navigate,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
