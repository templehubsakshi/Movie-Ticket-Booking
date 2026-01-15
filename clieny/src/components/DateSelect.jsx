import { useState } from "react";
// useState → selected date ko store karne ke liye

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
// Sirf UI icons (left / right arrows)
// Backend se koi relation nahi

import BlurCircle from "./BlurCircle";
// Pure UI decoration component
// Backend ya data flow se koi lena-dena nahi

import toast from "react-hot-toast";
// User ko error / info message dikhane ke liye

import { useNavigate } from "react-router-dom";
// Page navigation ke liye (SeatLayout page par bhejne ke liye)


// --------------------------------------------------
// DateSelect Component
// --------------------------------------------------
// Props:
// 1) dateTime → backend se aaya hua show dates object
// 2) id       → movieId (MovieDetails se aata hai)
//
// dateTime ka structure (VERY IMPORTANT):
/*
dateTime = {
  "2025-02-10": [
    { time: "10:30", showId: "abc123" },
    { time: "14:00", showId: "xyz456" }
  ],
  "2025-02-11": [
    { time: "18:00", showId: "lmn789" }
  ]
}
*/
// --------------------------------------------------

const DateSelect = ({ dateTime, id }) => {
  const navigate = useNavigate();
  // navigate() → programmatically route change karne ke liye

  const [selected, setSelected] = useState(null);
  // selected → user ne kaunsi DATE choose ki
  // Example: "2025-02-10"
  // Initially null hota hai (koi date select nahi)

  // --------------------------------------------------
  // Book Now button handler
  // --------------------------------------------------
  const onBookHandler = () => {
    // Agar user ne koi date select nahi ki
    if (!selected) {
      return toast("Please select a date");
    }

    // Route change:
    // /movies/:movieId/:date
    // Example: /movies/65ad8e/2025-02-10
    // Ye route SeatLayout.jsx handle karta hai
    navigate(`/movies/${id}/${selected}`);

    // Page ko top se start karwane ke liye
    scrollTo(0, 0);
  };

  return (
    // id="dateSelect" isliye hai kyunki
    // MovieDetails page se anchor link (#dateSelect) aata hai
    <div id="dateSelect" className="pt-30">

      <div className="flex flex-col md:flex-row items-center justify-between gap-10 relative p-8 bg-primary/10 border border-primary/20 rounded-lg">
        
        {/* Decorative UI elements */}
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle top="100px" right="0" />

        {/* LEFT SIDE — DATE SELECTION */}
        <div>
          <p className="text-lg font-semibold">Choose Date</p>

          <div className="flex items-center gap-6 text-sm mt-5">
            <ChevronLeftIcon width={28} />

            {/* 
              Object.keys(dateTime) → saare available dates
              Example output:
              ["2025-02-10", "2025-02-11"]

              Ye dates backend se aaye hote hain
              Backend: Show controller (dateTime object banata hai)
            */}
            <span className="grid grid-cols-3 md:flex flex-wrap md:max-w-lg gap-4">

              {dateTime &&
                Object.keys(dateTime).map((date) => (
                  <button
                    key={date}
                    onClick={() => setSelected(date)}
                    // User jis date par click karega
                    // wahi selected state me store ho jaayega

                    className={`flex flex-col items-center justify-center h-14 w-14 aspect-square rounded cursor-pointer ${
                      selected === date
                        ? "bg-primary text-white"
                        : "border border-primary/70"
                    }`}
                  >
                    {/* Date number (10, 11, etc.) */}
                    <span>{new Date(date).getDate()}</span>

                    {/* Month short name (Feb, Mar, etc.) */}
                    <span>
                      {new Date(date).toLocaleString("en-US", {
                        month: "short",
                      })}
                    </span>
                  </button>
                ))}
            </span>

            <ChevronRightIcon width={28} />
          </div>
        </div>

        {/* RIGHT SIDE — BOOK BUTTON */}
        <button
          onClick={onBookHandler}
          // Validation + navigation yahin hoti hai
          className="bg-primary text-white px-8 py-2 mt-6 rounded hover:bg-primary/90 transiton-all cursor-pointer"
        >
          Book Now
        </button>
      </div>
    </div>
  );
};

export default DateSelect;
