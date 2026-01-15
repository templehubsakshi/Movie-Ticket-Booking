// ======================= AppContext.jsx =======================

import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios"; // For making API requests
import { useAuth, useUser } from "@clerk/clerk-react"; // For authentication
import { useLocation, useNavigate } from "react-router-dom"; // For routing/navigation
import toast from "react-hot-toast"; // For notifications/toasts

// Set the base URL for all axios requests from environment variable
axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

// Create the context
export const AppContext = createContext();

// Provider component to wrap around your app
export const AppProvider = ({ children }) => {
  // States
  const [isAdmin, setIsAdmin] = useState(false); // Tracks if logged-in user is admin
  const [shows, setShows] = useState([]); // Stores all shows fetched from backend
  const [favoriteMovies, setFavoriteMovies] = useState([]); // Stores user's favorite movies

  const image_base_url = import.meta.env.VITE_TMDB_IMAGE_BASE_URL; 
  // Used in MovieCard to render movie images
  // Example: <img src={image_base_url + movie.backdrop_path} />

  // Clerk user auth hooks
  const { user } = useUser(); // Logged-in user object
  const { getToken } = useAuth(); // Function to get token for authenticated API requests

  const location = useLocation(); // Current URL location
  const navigate = useNavigate(); // Navigation hook

  // ======================= FUNCTIONS =======================

  // Check if user is admin
  const fetchIsAdmin = async () => {
    try {
      const { data } = await axios.get("/api/admin/is-admin", {
        headers: { Authorization: `Bearer ${await getToken()}` }, 
        // Authorization header required for protected routes
      });

      setIsAdmin(data.isAdmin);

      // If user is not admin but tries to access admin routes
      if (!data.isAdmin && location.pathname.startsWith("/admin")) {
        navigate("/"); // Redirect to homepage
        toast.error("You are not authorized to access admin dashboard");
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Fetch all shows from backend
  const fetchShows = async () => {
    try {
      const { data } = await axios.get("/api/show/all");
      if (data.success) {
        setShows(data.shows); 
        // Shows array is used in FeaturedSection.jsx:
        // shows.slice(0, 4).map(show => <MovieCard movie={show} />)
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Fetch user's favorite movies from backend
  const fetchFavoriteMovies = async () => {
    try {
      const { data } = await axios.get("/api/user/favorites", {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });

      if (data.success) {
        setFavoriteMovies(data.movies);
        // favoriteMovies can be used in "Favorites" page or component
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // ======================= EFFECTS =======================
  
  // Fetch shows when the component mounts
  useEffect(() => {
    fetchShows();
  }, []);

  // Fetch admin info and favorite movies when user logs in
  useEffect(() => {
    if (user) {
      fetchIsAdmin(); // Check if logged-in user is admin
      fetchFavoriteMovies(); // Fetch user's favorite movies
    }
  }, [user]);

  // ======================= CONTEXT VALUE =======================
  const value = {
    axios, // Can be used anywhere via useAppContext
    fetchIsAdmin,
    user, // Logged-in user info
    getToken, // Auth token
    navigate,
    isAdmin, // Boolean flag
    shows, // Array of all shows
    favoriteMovies, // Array of user's favorites
    fetchFavoriteMovies, // Function to refresh favorites
    image_base_url, // Base URL for images
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Custom hook to use the context
export const useAppContext = () => useContext(AppContext);

// ======================= NOTES / POTENTIAL ISSUES =======================
/*
1️⃣ Shows data
- `shows` comes from backend `/api/show/all`
- Each show object should have a `movie` field populated with Movie data
- Example show object:
  {
    _id: "show1",
    movie: { _id, title, backdrop_path, poster_path, release_date, genres, vote_average, runtime },
    showDateTime: Date,
    showPrice: Number,
    occupiedSeats: Object
  }

2️⃣ Favorite Movies
- Must match backend Movie schema exactly
- If movie IDs do not match backend, favorite mapping will fail

3️⃣ Admin check
- If user is not admin, they are redirected from `/admin/*` routes
- Ensure token is valid for protected API

4️⃣ Image Base URL
- Must match TMDB or your backend image path
- Used in MovieCard for rendering images

5️⃣ Error handling
- All API calls catch errors, but consider user-friendly messages

6️⃣ Integration with components
- FeaturedSection.jsx → uses `shows`
- MovieCard.jsx → uses `movie` prop (comes from show.movie)
- HeroSection.jsx → static content for now
- TrailersSection.jsx → uses dummyTrailers (static)

7️⃣ Navigation
- Always check routes exist in React Router, otherwise `navigate` will fail
*/
