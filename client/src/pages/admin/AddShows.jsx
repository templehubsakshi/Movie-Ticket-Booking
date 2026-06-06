import { useEffect, useState } from "react";
import Loading from "../../components/Loading";
import Title from "../../components/admin/Title";
import { CheckIcon, DeleteIcon, StarIcon } from "lucide-react";
import { kConverter } from "../../lib/kConverter";
import { useAppContext } from "../../context/AppContext";
import toast from "react-hot-toast";

const AddShows = () => {
  const { axios, user, image_base_url } = useAppContext();
  const currency = import.meta.env.VITE_CURRENCY;

  const [nowPlayingMovies, setNowPlayingMovies] = useState([]);
  const [selectedMovie, setSelectedMovie]       = useState(null);
  const [dateTimeSelection, setDateTimeSelection] = useState({});
  const [dateTimeInput, setDateTimeInput]        = useState("");
  // LOW-11 fix: store showPrice as number, not string.
  const [showPrice, setShowPrice]                = useState(0);
  const [addingShow, setAddingShow]              = useState(false);
  const [isFetching, setIsFetching]              = useState(true);

  const fetchNowPlayingMovies = async () => {
    try {
      const { data } = await axios.get("/api/show/now-playing");
      if (data.success) setNowPlayingMovies(data.movies);
    } catch (error) {
      console.error("Error fetching movies:", error);
      toast.error("Could not load movies. Please try again.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleDateTimeAdd = () => {
    if (!dateTimeInput) return;
    const [date, time] = dateTimeInput.split("T");
    if (!date || !time) return;

    // MED-09: prevent adding past showtimes on the client side too.
    if (new Date(dateTimeInput) <= new Date()) {
      return toast.error("Showtime must be in the future.");
    }

    setDateTimeSelection((prev) => {
      const times = prev[date] || [];
      if (times.includes(time)) return prev;
      return { ...prev, [date]: [...times, time] };
    });
    setDateTimeInput("");
  };

  const handleRemoveTime = (date, time) => {
    setDateTimeSelection((prev) => {
      const filtered = prev[date].filter((t) => t !== time);
      if (filtered.length === 0) {
        const { [date]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [date]: filtered };
    });
  };

  const handleSubmit = async () => {
    if (!selectedMovie || Object.keys(dateTimeSelection).length === 0 || !showPrice) {
      return toast.error("Please select a movie, add at least one showtime, and set a price.");
    }
    // MED-09 fix: client-side guard for price <= 0.
    if (showPrice <= 0) {
      return toast.error("Show price must be greater than 0.");
    }

    setAddingShow(true);
    try {
      const showsInput = Object.entries(dateTimeSelection).map(([date, time]) => ({ date, time }));
      const { data } = await axios.post("/api/show/add", {
        movieId: selectedMovie,
        showsInput,
        showPrice,
      });

      if (data.success) {
        toast.success(data.message);
        setSelectedMovie(null);
        setDateTimeSelection({});
        setShowPrice(0);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setAddingShow(false);
    }
  };

  useEffect(() => {
    if (user) fetchNowPlayingMovies();
  }, [user]);

  if (isFetching) return <Loading />;

  if (!nowPlayingMovies.length) {
    return (
      <div className="flex flex-col items-center justify-center h-60 text-gray-400">
        <p className="text-lg">No now-playing movies found from TMDB.</p>
        <button
          onClick={() => { setIsFetching(true); fetchNowPlayingMovies(); }}
          className="mt-4 px-6 py-2 bg-primary rounded-full text-sm text-white hover:bg-primary-dull transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <Title text1="Add" text2="Shows" />

      <p className="mt-10 text-lg font-medium">Now Playing Movies</p>
      <div className="overflow-x-auto pb-4">
        <div className="flex flex-wrap gap-4 mt-4 w-max">
          {nowPlayingMovies.map((movie) => (
            <div
              key={movie.id}
              onClick={() => setSelectedMovie(movie.id)}
              className="relative max-w-40 cursor-pointer hover:-translate-y-1 transition"
            >
              <img src={image_base_url + movie.poster_path} alt="poster" className="rounded-lg" />
              <div className="absolute bottom-0 w-full bg-black/70 p-2 flex justify-between text-sm">
                <p className="flex items-center gap-1">
                  <StarIcon className="w-4 h-4 fill-primary text-primary" />
                  {movie.vote_average.toFixed(1)}
                </p>
                <p>{kConverter(movie.vote_count)} Votes</p>
              </div>
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

      <div className="mt-8">
        <label>Show Price</label>
        <div className="flex gap-2 border px-3 py-2 rounded">
          <span>{currency}</span>
          {/* LOW-11 fix: onChange stores number; min=1 enforces positive price */}
          <input
            type="number"
            min={1}
            step="0.01"
            value={showPrice}
            onChange={(e) => setShowPrice(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="mt-6 flex gap-2 items-center">
        <input
          type="datetime-local"
          value={dateTimeInput}
          onChange={(e) => setDateTimeInput(e.target.value)}
        />
        <button
          onClick={handleDateTimeAdd}
          className="px-4 py-2 bg-primary text-white text-sm rounded hover:bg-primary-dull transition"
        >
          Add Time
        </button>
      </div>

      {Object.keys(dateTimeSelection).length > 0 && (
        <div className="mt-6 space-y-2">
          {Object.entries(dateTimeSelection).map(([date, times]) => (
            <div key={date}>
              <p className="font-medium text-sm text-gray-300">{date}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {times.map((time) => (
                  <span
                    key={time}
                    className="flex items-center gap-1 px-3 py-1 bg-primary/20 rounded-full text-sm"
                  >
                    {time}
                    <DeleteIcon
                      className="w-3 h-3 cursor-pointer hover:text-red-400"
                      onClick={() => handleRemoveTime(date, time)}
                    />
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={addingShow}
        className="mt-8 px-8 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary-dull transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {addingShow ? "Adding…" : "Add Show"}
      </button>
    </>
  );
};

export default AddShows;
