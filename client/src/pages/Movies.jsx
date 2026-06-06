import BlurCircle from "../components/BlurCircle";
import MovieCard from "../components/MovieCard";
import Loading from "../components/Loading";
import { useAppContext } from "../context/AppContext";
import { useState, useMemo } from "react";
import { SearchIcon, XIcon } from "lucide-react";

const Movies = () => {
  const { shows, isShowsLoading } = useAppContext();
  const [search, setSearch] = useState("");

  // Filter movies by search query
  const filtered = useMemo(() => {
    if (!search.trim()) return shows;
    const q = search.toLowerCase();
    return shows.filter(
      (m) =>
        m.title?.toLowerCase().includes(q) ||
        m.genres?.some((g) => g.name?.toLowerCase().includes(q))
    );
  }, [shows, search]);

  if (isShowsLoading) return <Loading />;

  return (
    <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]">
      <BlurCircle top="150px" left="0" />
      <BlurCircle bottom="50px" right="50px" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 my-4">
        <h1 className="text-lg font-medium">Now Showing</h1>

        {/* Search bar */}
        <div className="relative w-full sm:w-72">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search movies or genres…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full pl-9 pr-9 py-2 text-sm
              placeholder-gray-500 focus:outline-none focus:border-primary/50 transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="flex flex-wrap max-sm:justify-center gap-8 mt-2">
          {filtered.map((movie) => (
            <MovieCard key={movie._id} movie={movie} />
          ))}
        </div>
      ) : shows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
          <h1 className="text-3xl font-bold text-center">No movies available</h1>
          <p className="text-gray-400 mt-2 text-sm">Check back soon for upcoming shows.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32">
          <p className="text-xl font-semibold">No results for "{search}"</p>
          <p className="text-gray-400 mt-2 text-sm">Try a different title or genre.</p>
        </div>
      )}
    </div>
  );
};

export default Movies;
