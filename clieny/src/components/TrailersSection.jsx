import { useState } from "react";
import { PlayCircleIcon } from "lucide-react";

// Dummy data for demo purposes
const dummyTrailers = [
  {
        image: "https://img.youtube.com/vi/WpW36ldAqnM/maxresdefault.jpg",
        videoUrl: 'https://www.youtube.com/watch?v=WpW36ldAqnM'
    },
    {
        image: "https://img.youtube.com/vi/-sAOWhvheK8/maxresdefault.jpg",
        videoUrl: 'https://www.youtube.com/watch?v=-sAOWhvheK8'
    },
    {
        image: "https://img.youtube.com/vi/1pHDWnXmK7Y/maxresdefault.jpg",
        videoUrl: 'https://www.youtube.com/watch?v=1pHDWnXmK7Y'
    },
    {
        image: "https://img.youtube.com/vi/umiKiW4En9g/maxresdefault.jpg",
        videoUrl: 'https://www.youtube.com/watch?v=umiKiW4En9g'
    },
];

const BlurCircle = ({ top, right }) => (
  <div 
    className="absolute w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"
    style={{ top, right }}
  />
);

const TrailersSection = () => {
  const [currentTrailer, setCurrentTrailer] = useState(dummyTrailers[0]);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-44 py-20 overflow-hidden bg-black">
      <p className="text-gray-300 font-medium text-lg max-w-[960px] mx-auto">
        Trailers
      </p>
      <div className="relative mt-6 max-w-[960px] mx-auto">
        <BlurCircle top="-100px" right="-100px" />
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          <iframe
            src={`${currentTrailer.videoUrl.replace('watch?v=', 'embed/')}${playing ? '?autoplay=1' : ''}`}
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
      <div className="group grid grid-cols-4 gap-4 md:gap-8 mt-8 max-w-3xl mx-auto">
        {dummyTrailers.map((trailer, index) => (
          <div
            key={index}
            className="relative transition-all duration-300 cursor-pointer group/item hover:scale-105"
            onClick={() => {
              setCurrentTrailer(trailer);
              setPlaying(true);
            }}
          >
            <img
              src={trailer.image}
              alt={`trailer ${index + 1}`}
              className="rounded-lg w-full h-full object-cover brightness-75 aspect-video"
            />
            <div className="absolute inset-0 bg-black/20 group-hover/item:bg-black/40 transition-all rounded-lg" />
            <PlayCircleIcon
              strokeWidth={1.6}
              className="absolute top-1/2 left-1/2 w-8 h-8 md:w-12 md:h-12 transform -translate-x-1/2 -translate-y-1/2 text-white/90 group-hover/item:text-white group-hover/item:scale-110 transition-all"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrailersSection;