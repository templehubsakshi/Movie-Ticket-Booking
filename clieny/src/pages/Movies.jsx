import BlurCircle from "../components/BlurCircle";
// BlurCircle ek UI-only component hai
// Iska backend ya data se koi lena-dena nahi
// Sirf background me blur effect dikhane ke liye use hota hai

import MovieCard from "../components/MovieCard";
// MovieCard ek reusable component hai
// Ye ek single movie/show ka card UI me dikhata hai
// Isko data Movies.jsx se props ke through milta hai

import { useAppContext } from "../context/AppContext";
// useAppContext se hum GLOBAL state access karte hain
// Ye data AppContext.jsx me store hota hai

const Movies = () => {

  // 👇 shows yaha AppContext se aa raha hai
  // AppContext ke andar fetchShows() function hai
  // fetchShows() backend API call karta hai:
  //
  // GET /api/show/all
  //
  // Backend flow:
  // Route -> Controller -> Show Model
  // Show.find().populate("movie")
  //
  // Isliye har "show" ke andar "movie" ka data bhi hota hai
  const { shows } = useAppContext();

  // Agar backend se shows aa gaye (array empty nahi hai)
  if (shows.length > 0) {
    return (
      <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]">

        {/* Background blur circles – sirf UI ke liye */}
        <BlurCircle top="150px" left="0" />
        <BlurCircle bottom="50px" right="50px" />

        <h1 className="text-lg font-medium my-4">
          Now Showing
        </h1>

        <div className="flex flex-wrap max-sm:justify-center gap-8">

          {/*
            🔥 MOST IMPORTANT PART — map()
            
            shows ek ARRAY hai
            Har element ek SHOW object hai
            
            Example ek show ka structure (backend se):
            {
              _id: "showId",
              movie: {
                _id,
                title,
                poster_path,
                backdrop_path,
                release_date,
                genres,
                runtime,
                vote_average
              },
              showDateTime,
              showPrice,
              occupiedSeats
            }
            
            Ye data backend se aa raha hai:
            Show.find().populate("movie")
          */}

          {shows.map((movie) => (
            // ⚠️ yaha variable ka naam "movie" hai
            // lekin actually ye ek SHOW object hai
            // (andar movie populated hoti hai)

            <MovieCard
              key={movie._id}
              // React ko batata hai ki har card unique hai
              // yaha Show ka _id use ho raha hai

              movie={movie}
              // pura show object MovieCard ko diya ja raha hai
              // MovieCard ke andar:
              // movie.movie.title  -> Movie title
              // movie.movie.backdrop_path -> Movie image
              // movie._id -> Show id (routing ke liye)
            />
          ))}
        </div>
      </div>
    );
  }

  // 👇 Agar backend se koi show nahi aaya
  // ya database empty hai
  // ya API fail ho gayi
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold text-center">
        No movies available
      </h1>
    </div>
  );
};

export default Movies;
