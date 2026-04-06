import { createContext, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

// Single request interceptor — attaches Bearer token from localStorage
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser]           = useState(null);
  const [token, setToken]         = useState(() => localStorage.getItem("token") || "");
  const [isAdmin, setIsAdmin]     = useState(false);
  const [shows, setShows]         = useState([]);
  const [favoriteMovies, setFavoriteMovies] = useState([]);

  const image_base_url = import.meta.env.VITE_TMDB_IMAGE_BASE_URL;

  const location = useLocation();
  const navigate  = useNavigate();

  // Track if we've already attempted a session restore on this mount
  const sessionRestored = useRef(false);

  // ── Keep localStorage + axios default header in sync with token state ──────
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      localStorage.removeItem("token");
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // ── Login helper ─────────────────────────────────────────────────────────────
  const login = (tokenValue, userData) => {
    setToken(tokenValue);
    setUser(userData);
  };

  // ── Logout helper ─────────────────────────────────────────────────────────────
  const logout = () => {
    setToken("");
    setUser(null);
    setIsAdmin(false);
    setFavoriteMovies([]);
    navigate("/");
    toast.success("Logged out successfully");
  };

  // ── Restore session from stored token on first mount ──────────────────────
  useEffect(() => {
    if (!token || sessionRestored.current) return;
    sessionRestored.current = true;

    axios.get("/api/auth/me")
      .then(({ data }) => {
        if (data.success) setUser(data.user);
        else {
          setToken("");
          localStorage.removeItem("token");
        }
      })
      .catch(() => {
        setToken("");
        localStorage.removeItem("token");
      });
  }, [token]);

  // ── Check admin status ────────────────────────────────────────────────────────
  const fetchIsAdmin = async () => {
    try {
      const { data } = await axios.get("/api/admin/is-admin");
      setIsAdmin(!!data.isAdmin);

      if (!data.isAdmin && location.pathname.startsWith("/admin")) {
        navigate("/");
        toast.error("You are not authorized to access the admin dashboard");
      }
    } catch {
      setIsAdmin(false);
    }
  };

  // ── Fetch all shows ───────────────────────────────────────────────────────────
  const fetchShows = async () => {
    try {
      const { data } = await axios.get("/api/show/all");
      if (data.success) setShows(data.shows);
      else toast.error(data.message);
    } catch (error) {
      console.error(error);
    }
  };

  // ── Fetch user's favorite movies ──────────────────────────────────────────────
  const fetchFavoriteMovies = async () => {
    try {
      const { data } = await axios.get("/api/user/favorites");
      if (data.success) setFavoriteMovies(data.movies);
      else toast.error(data.message);
    } catch (error) {
      console.error(error);
    }
  };

  // ── Effects ───────────────────────────────────────────────────────────────────
  useEffect(() => { fetchShows(); }, []);

  useEffect(() => {
    if (user) {
      fetchIsAdmin();
      fetchFavoriteMovies();
    }
  }, [user]);

  const value = {
    axios,
    user,
    token,
    login,
    logout,
    isAdmin,
    fetchIsAdmin,
    shows,
    favoriteMovies,
    fetchFavoriteMovies,
    image_base_url,
    navigate,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
