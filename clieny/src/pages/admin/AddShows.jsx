// React hooks for state and lifecycle
import { useEffect, useState } from "react";

// Loading component (jab data nahi aata)
import Loading from "../../components/Loading";

// Admin page title component
import Title from "../../components/admin/Title";

// Icons used in UI
import { CheckIcon, DeleteIcon, StarIcon } from "lucide-react";

// Utility function: converts numbers like 12000 → 12k
import { kConverter } from "../../lib/kConverter";

// Global App Context (axios, auth token, user, image base url)
import { useAppContext } from "../../context/AppContext";

// Toast notifications (success / error messages)
import toast from "react-hot-toast";

const AddShows = () => {
  /**
   * Context se common cheezein mil rahi hain:
   * axios        → API calls ke liye
   * getToken     → JWT token lene ke liye
   * user         → current logged-in user (admin)
   * image_base_url → TMDB images ka base path
   */
  const { axios, getToken, user, image_base_url } = useAppContext();

  // Currency symbol (₹ / $) .env file se
  const currency = import.meta.env.VITE_CURRENCY;

  /**
   * =====================
   * STATE VARIABLES
   * =====================
   */

  // Abhi chal rahi movies (TMDB se)
  const [nowPlayingMovies, setNowPlayingMovies] = useState([]);

  // Admin ne jo movie select ki hai uski ID
  const [selectedMovie, setSelectedMovie] = useState(null);

  /**
   * Selected date & time ka structure:
   * {
   *   "2025-01-10": ["14:30", "18:00"],
   *   "2025-01-11": ["16:00"]
   * }
   */
  const [dateTimeSelection, setDateTimeSelection] = useState({});

  // datetime-local input ka value
  const [dateTimeInput, setDateTimeInput] = useState("");

  // Show ka ticket price
  const [showPrice, setShowPrice] = useState("");

  // Submit ke time button disable karne ke liye
  const [addingShow, setAddingShow] = useState(false);

  /**
   * =====================
   * FETCH NOW PLAYING MOVIES
   * =====================
   */
  const fetchNowPlayingMovies = async () => {
    try {
      const { data } = await axios.get("/api/show/now-playing", {
        headers: {
          Authorization: `Bearer ${await getToken()}`,
        },
      });

      // Agar API successful ho
      if (data.success) {
        setNowPlayingMovies(data.movies);
      }
    } catch (error) {
      console.error("Error fetching movies:", error);
    }
  };

  /**
   * =====================
   * ADD DATE & TIME
   * =====================
   */
  const handleDateTimeAdd = () => {
    // Agar input empty hai to kuch nahi karna
    if (!dateTimeInput) return;

    // "2025-01-10T14:30" → ["2025-01-10", "14:30"]
    const [date, time] = dateTimeInput.split("T");

    // Safety check
    if (!date || !time) return;

    setDateTimeSelection((prev) => {
      // Agar date already exist karti hai
      const times = prev[date] || [];

      // Duplicate time add nahi hone dena
      if (!times.includes(time)) {
        return {
          ...prev,
          [date]: [...times, time],
        };
      }

      return prev;
    });
  };

  /**
   * =====================
   * REMOVE TIME
   * =====================
   */
  const handleRemoveTime = (date, time) => {
    setDateTimeSelection((prev) => {
      // Selected date ke andar se time remove karna
      const filteredTimes = prev[date].filter((t) => t !== time);

      // Agar kisi date me koi time nahi bacha
      // to us date ko bhi object se remove kar do
      if (filteredTimes.length === 0) {
        const { [date]: _, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [date]: filteredTimes,
      };
    });
  };

  /**
   * =====================
   * SUBMIT SHOW
   * =====================
   */
  const handleSubmit = async () => {
    try {
      setAddingShow(true);

      // Validation
      if (
        !selectedMovie ||
        Object.keys(dateTimeSelection).length === 0 ||
        !showPrice
      ) {
        return toast("Missing required fields");
      }

      /**
       * Backend ko is format me data chahiye:
       * [
       *   { date: "2025-01-10", time: ["14:30", "18:00"] }
       * ]
       */
      const showsInput = Object.entries(dateTimeSelection).map(
        ([date, time]) => ({ date, time })
      );

      const payload = {
        movieId: selectedMovie,
        showsInput,
        showPrice: Number(showPrice),
      };

      // API call to create shows
      const { data } = await axios.post("/api/show/add", payload, {
        headers: {
          Authorization: `Bearer ${await getToken()}`,
        },
      });

      if (data.success) {
        toast.success(data.message);

        // Form reset
        setSelectedMovie(null);
        setDateTimeSelection({});
        setShowPrice("");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("An error occurred. Please try again.");
    }

    setAddingShow(false);
  };

  /**
   * =====================
   * FETCH MOVIES ON LOAD
   * =====================
   */
  useEffect(() => {
    if (user) {
      fetchNowPlayingMovies();
    }
  }, [user]);

  /**
   * =====================
   * UI
   * =====================
   */
  return nowPlayingMovies.length > 0 ? (
    <>
      <Title text1="Add" text2="Shows" />

      {/* MOVIE LIST */}
      <p className="mt-10 text-lg font-medium">Now Playing Movies</p>

      <div className="overflow-x-auto pb-4">
        <div className="flex flex-wrap gap-4 mt-4 w-max">
          {nowPlayingMovies.map((movie) => (
            <div
              key={movie.id}
              onClick={() => setSelectedMovie(movie.id)}
              className="relative max-w-40 cursor-pointer hover:-translate-y-1 transition"
            >
              {/* Movie Poster */}
              <img
                src={image_base_url + movie.poster_path}
                alt="poster"
                className="rounded-lg"
              />

              {/* Rating & Votes */}
              <div className="absolute bottom-0 w-full bg-black/70 p-2 flex justify-between text-sm">
                <p className="flex items-center gap-1">
                  <StarIcon className="w-4 h-4 fill-primary text-primary" />
                  {movie.vote_average.toFixed(1)}
                </p>
                <p>{kConverter(movie.vote_count)} Votes</p>
              </div>

              {/* Selected check */}
              {selectedMovie === movie.id && (
                <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                  <CheckIcon className="text-white" />
                </div>
              )}

              <p className="font-medium truncate">{movie.title}</p>
              <p className="text-sm text-gray-400">{movie.release_date}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PRICE INPUT */}
      <div className="mt-8">
        <label>Show Price</label>
        <div className="flex gap-2 border px-3 py-2 rounded">
          <span>{currency}</span>
          <input
            type="number"
            min={0}
            value={showPrice}
            onChange={(e) => setShowPrice(e.target.value)}
          />
        </div>
      </div>

      {/* DATE TIME INPUT */}
      <div className="mt-6">
        <input
          type="datetime-local"
          value={dateTimeInput}
          onChange={(e) => setDateTimeInput(e.target.value)}
        />
        <button onClick={handleDateTimeAdd}>Add Time</button>
      </div>

      {/* SELECTED DATES & TIMES */}
      {Object.keys(dateTimeSelection).length > 0 && (
        <div className="mt-6">
          {Object.entries(dateTimeSelection).map(([date, times]) => (
            <div key={date}>
              <p>{date}</p>
              {times.map((time) => (
                <span key={time}>
                  {time}
                  <DeleteIcon
                    onClick={() => handleRemoveTime(date, time)}
                  />
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* SUBMIT BUTTON */}
      <button onClick={handleSubmit} disabled={addingShow}>
        Add Show
      </button>
    </>
  ) : (
    <Loading />
  );
};

export default AddShows;
