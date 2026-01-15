import { ArrowRight } from "lucide-react"; // Arrow icon from lucide-react
import { useNavigate } from "react-router-dom"; // Hook to navigate programmatically
import BlurCircle from "./BlurCircle"; // Decorative blurred circle component
import MovieCard from "./MovieCard"; // Component to render a single movie/show card
import { useAppContext } from "../context/AppContext"; // Global context for shared data

const FeaturedSection = () => {
  const navigate = useNavigate(); // Initialize navigation function

  const { shows } = useAppContext(); 
  // 🔹 Data source:
  // 'shows' comes from AppContext (React context)
  // AppContext fetches it from backend API: `/api/show/all` or `/api/show/now-playing`
  // Backend Show model structure:
  /*
    {
      _id: String,               // Unique show ID
      movie: Object,             // Populated Movie object from Movie model
      showDateTime: Date,        // Show date and time
      showPrice: Number,         // Price of show
      occupiedSeats: Object      // Seat occupancy map { "A1": userId, "B2": userId }
    }
  */
  // ⚠ Important: movie is populated in backend, so frontend can access movie.title, movie.poster_path, etc.

  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-44 overflow-hidden">
      {/* Main container with responsive padding */}
      
      <div className="relative flex items-center justify-between pt-20 pb-10">
        {/* Header: Section title and "View All" button */}
        <BlurCircle top="0" right="-80px" /> 
        {/* Decorative background blur circle */}
        
        <p className="text-gray-300 font-medium text-lg">Now Showing</p>
        {/* Section heading */}
        
        <button
          onClick={() => {
            navigate("/movies"); // Navigate to Movies page
            scrollTo(0, 0);       // Scroll to top on navigation
          }}
          className="group flex items-center gap-2 text-sm text-gray-300 cursor-pointer"
        >
          View All
          <ArrowRight className="group-hover:translate-x-0.5 transition w-4.5 h-4.5" />
          {/* Arrow icon moves slightly on hover */}
        </button>
      </div>

      <div className="flex flex-wrap max-sm:justify-center gap-8 mt-8">
        {/* Container for the featured MovieCards */}
        
        {shows.slice(0, 4).map((show) => (
          // 🔹 Mapping over first 4 shows for featured display
          // ⚠ Note: .map() is key for rendering dynamic lists
          <MovieCard key={show._id} movie={show} />
          // 🔹 Passing 'show' object to MovieCard as prop called 'movie'
          // In MovieCard:
          //   - show.movie.title → Movie title
          //   - show.movie.poster_path → Poster image
          //   - show.showDateTime → Show date and time
          //   - show.showPrice → Price
          //   - show.occupiedSeats → Seat occupancy
          // This mapping allows dynamic rendering of movies with data directly from backend
        ))}
      </div>

      <div className="flex justify-center mt-20">
        {/* Button to show more movies */}
        <button
          onClick={() => {
            navigate("/movies"); // Navigate to Movies page
            scrollTo(0, 0);
          }}
          className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer"
        >
          Show more
        </button>
      </div>
    </div>
  );
};

export default FeaturedSection;
