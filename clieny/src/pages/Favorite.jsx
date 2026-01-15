// Import decorative background circle component
import BlurCircle from "../components/BlurCircle";
// Import the card component used to display a single movie
import MovieCard from "../components/MovieCard";
// Import app-wide context (favorites list, etc.)
import { useAppContext } from "../context/AppContext";

const Favorite = () => {
  // Get the favorite movies array from context
  const { favoriteMovies } = useAppContext();

  return favoriteMovies.length > 0 ? (
    // If there are favorite movies, display them
    <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]">
      {/* Decorative background circles */}
      <BlurCircle top="150px" left="0" />
      <BlurCircle bottom="50px" right="50px" />

      {/* Page Heading */}
      <h1 className="text-lg font-medium my-4">Your Favorite Movies</h1>

      {/* Grid/row of movie cards */}
      <div className="flex flex-wrap max-sm:justify-center gap-8">
        {favoriteMovies.map((movie) => (
          // MovieCard is a reusable component that shows movie poster, title, rating, etc.
          <MovieCard movie={movie} key={movie._id} />
        ))}
      </div>
    </div>
  ) : (
    // If there are no favorite movies, display a message
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold text-center">No movies available</h1>
    </div>
  );
};

export default Favorite;
