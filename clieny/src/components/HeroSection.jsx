import React from "react";
import { ArrowRight, PlayCircle, CalendarIcon, Clock3Icon } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div
        className='absolute inset-0 bg-[url("/background-img.jpg")] bg-cover bg-center'
        aria-hidden="true"
      />

      {/* Dark overlay for readability */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/20"
        aria-hidden="true"
      />

      {/* Soft bottom fade */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 flex h-full items-center px-6 md:px-16 lg:px-28">
        <div className="max-w-2xl pt-16">
          <span className="mb-5 inline-block rounded-full border border-white/10 bg-primary/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Now Showing
          </span>

          <h1 className="text-5xl font-semibold leading-tight text-white md:text-7xl md:leading-[1.05]">
            Book Your Next
            <br />
            Movie Experience
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-gray-300 md:text-base">
            <span>Action • Drama • Sci-Fi</span>

            <div className="flex items-center gap-1.5">
              <CalendarIcon className="h-4 w-4" />
              <span>Latest Releases</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Clock3Icon className="h-4 w-4" />
              <span>Instant Booking</span>
            </div>
          </div>

          <p className="mt-6 max-w-xl text-base leading-7 text-gray-300 md:text-lg">
            Discover the latest blockbusters, explore trending releases, and reserve your seats instantly — all in one place.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              onClick={() => navigate("/movies")}
              className="flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-white transition hover:scale-[1.02] hover:bg-primary-dull"
            >
              Book Tickets
              <ArrowRight className="h-5 w-5" />
            </button>

            <button
              onClick={() => navigate("/movies")}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-7 py-3.5 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/15"
            >
              <PlayCircle className="h-5 w-5" />
              Watch Trailer
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200">
              Latest Releases
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200">
              Easy Booking
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200">
              HD Trailers
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
