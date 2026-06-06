import { useState } from "react"; 
// useState hook to manage local component state (current trailer)
import { dummyTrailers } from "../assets/assets"; 
// Array of trailer data from static assets (not backend for now)
// Each trailer object likely looks like:
// { videoUrl: String, image: String, title?: String }
import ReactPlayer from "react-player"; 
// Library to embed and play video URLs (YouTube, Vimeo, etc.)
import BlurCircle from "./BlurCircle"; 
// Decorative component for blurred circle background
import { PlayCircleIcon } from "lucide-react"; 
// Icon to overlay play button on trailer thumbnail

const TrailersSection = () => {
  const [currentTrailer, setCurrentTrailer] = useState(dummyTrailers[0]); 
  // 🔹 State to track which trailer is currently playing
  // By default, first trailer in dummyTrailers is selected

  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-44 py-20 overflow-hidden">
      {/* Main container with responsive padding */}
      
      <p className="text-gray-300 font-medium text-lg max-w-[960] mx-auto">
        Trailers
      </p>
      {/* Section title */}

      <div className="relative mt-6">
        <BlurCircle top="-100px" right="-100px" />
        {/* Decorative background circle */}
        
        <ReactPlayer
          url={currentTrailer.videoUrl} 
          // 🔹 Video URL of current trailer
          controls={false} 
          // Controls disabled, optional: can enable
          className="mx-auto max-w-full"
          width="960px"
          height="540px"
        />
        {/* Video player component */}
      </div>

      <div className="group grid grid-cols-4 gap-4 md:gap-8 mt-8 max-w-3xl mx-auto">
        {/* Grid container for trailer thumbnails */}
        
        {dummyTrailers.map((trailer) => (
          // 🔹 .map() dynamically renders all trailer thumbnails
          // ⚠ map is key for looping over arrays in React
          <div
            key={trailer.image} 
            // Each child needs unique key → using trailer image URL as identifier
            className="relative group-hover:not-hover:opacity-50 hover:-translate-y-1 duration-300 transition max-md:h-60 md:max-h-60 cursor-pointer"
            onClick={() => setCurrentTrailer(trailer)}
            // 🔹 Click updates currentTrailer state → ReactPlayer updates automatically
          >
            <img
              src={trailer.image} 
              alt="trailer"
              className="rounded-lg w-full h-full object-cover brightness-75"
            />
            {/* Trailer thumbnail */}
            
            <PlayCircleIcon
              strokeWidth={1.6}
              className="absolute top-1/2 left-1/2 w-5 md:w-8 h-5 md:h-12 transform -translate-x-1/2"
            />
            {/* Overlay play icon centered on thumbnail */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrailersSection;
