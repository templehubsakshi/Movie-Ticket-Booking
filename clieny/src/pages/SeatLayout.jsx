// React hooks
import { useEffect, useState } from "react";

// React Router hooks
import { useNavigate, useParams } from "react-router-dom";

// Static assets (screen image)
import { assets } from "../assets/assets";

// Reusable components
import Loading from "../components/Loading";
import BlurCircle from "../components/BlurCircle";

// Icons
import { ArrowRightIcon, ClockIcon } from "lucide-react";

// Utility function to format ISO time
import isoTimeFormat from "../lib/isoTimeFormat";

// Toast notifications
import toast from "react-hot-toast";

// Global App Context
import { useAppContext } from "../context/AppContext";

const SeatLayout = () => {

  /* 
    groupRows defines the theatre seating structure
    Each letter represents a row (A–J)
  */
  const groupRows = [
    ["A", "B"],
    ["C", "D"],
    ["E", "F"],
    ["G", "H"],
    ["I", "J"],
  ];

  /*
    URL params:
    id   → movieId
    date → selected date (YYYY-MM-DD)
  */
  const { id, date } = useParams();

  // Selected seat IDs (example: ["A1", "A2"])
  const [selectedSeats, setSelectedSeats] = useState([]);

  // Selected show time object → { time, showId }
  const [selectedTime, setSelectedTime] = useState(null);

  // Full show data (movie + dateTime)
  const [show, setShow] = useState(null);

  // Seats already booked for a show
  const [occupiedSeats, setOccupiedSeats] = useState([]);

  const navigate = useNavigate();

  // Global context values
  const { axios, getToken, user } = useAppContext();

  /* 
    Fetch show details using movieId
    API → GET /api/show/:movieId
    Backend returns:
    {
      movie: {...},
      dateTime: {...}
    }
  */
  const getShow = async () => {
    try {
      const { data } = await axios.get(`/api/show/${id}`);
      if (data.success) {
        setShow(data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  /*
    Handle seat selection logic
  */
  const handleSeatClick = (seatId) => {

    // Time must be selected first
    if (!selectedTime) {
      return toast("Please select time first");
    }

    // Maximum 5 seats allowed
    if (!selectedSeats.includes(seatId) && selectedSeats.length > 4) {
      return toast("You can only select 5 seats");
    }

    // Already booked seat check
    if (occupiedSeats.includes(seatId)) {
      return toast("This seat is already booked");
    }

    // Toggle seat selection
    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((seat) => seat !== seatId)
        : [...prev, seatId]
    );
  };

  /*
    Render seats for a single row
    Example: A1–A9
  */
  const renderSeats = (row, count = 9) => (
    <div key={row} className="flex gap-2 mt-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: count }, (_, i) => {
          const seatId = `${row}${i + 1}`;

          return (
            <button
              key={seatId}
              onClick={() => handleSeatClick(seatId)}
              disabled={occupiedSeats.includes(seatId)} // UX improvement
              className={`h-8 w-8 rounded border border-primary/60 cursor-pointer
                ${selectedSeats.includes(seatId) && "bg-primary text-white"}
                ${occupiedSeats.includes(seatId) && "opacity-50 cursor-not-allowed"}
              `}
            >
              {seatId}
            </button>
          );
        })}
      </div>
    </div>
  );

  /*
    Fetch already booked seats using showId
    API → GET /api/booking/seats/:showId
  */
  const getOccupiedSeats = async () => {
    try {
      const { data } = await axios.get(
        `/api/booking/seats/${selectedTime.showId}`
      );

      if (data.success) {
        setOccupiedSeats(data.occupiedSeats);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  /*
    Create booking and redirect to payment
  */
  const bookTickets = async () => {
    try {
      if (!user) return toast.error("Please login to proceed");

      if (!selectedTime || !selectedSeats.length) {
        return toast.error("Please select a time and seats");
      }

      const { data } = await axios.post(
        "/api/booking/create",
        {
          showId: selectedTime.showId,
          selectedSeats,
        },
        {
          headers: { Authorization: `Bearer ${await getToken()}` },
        }
      );

      if (data.success) {
        // Redirect to Stripe payment
        window.location.href = data.url;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  /*
    Fetch show when movieId changes
    (FIXED dependency bug)
  */
  useEffect(() => {
    getShow();
  }, [id]);

  /*
    Fetch occupied seats when time is selected
  */
  useEffect(() => {
    if (selectedTime) {
      getOccupiedSeats();
    }
  }, [selectedTime]);

  // UI Rendering
  return show ? (
    <div className="flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-30 md:pt-50">

      {/* Available Show Timings */}
      <div className="w-60 bg-primary/10 border border-primary/20 rounded-lg py-10 h-max md:sticky md:top-30">
        <p className="text-lg font-semibold px-6">Available Timings</p>

        <div className="mt-5 space-y-1">
          {show.dateTime?.[date]?.map((item) => (
            <div
              key={item.time}
              onClick={() => setSelectedTime(item)}
              className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md cursor-pointer transition
                ${
                  selectedTime?.time === item.time
                    ? "bg-primary text-white"
                    : "hover:bg-primary/20"
                }
              `}
            >
              <ClockIcon className="w-4 h-4" />
              <p className="text-sm">{isoTimeFormat(item.time)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Seat Layout */}
      <div className="relative flex-1 flex flex-col items-center max-md:mt-16">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle bottom="0" right="0" />

        <h1 className="text-2xl font-semibold mb-4">Select your seat</h1>

        <img src={assets.screenImage} alt="screen" />
        <p className="text-gray-400 text-sm mb-6">SCREEN SIDE</p>

        <div className="flex flex-col items-center mt-10 text-xs text-gray-300">
          <div className="grid grid-cols-2 md:grid-cols-1 gap-8 md:gap-2 mb-6">
            {groupRows[0].map((row) => renderSeats(row))}
          </div>

          <div className="grid grid-cols-2 gap-11">
            {groupRows.slice(1).map((group, idx) => (
              <div key={idx}>
                {group.map((row) => renderSeats(row))}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={bookTickets}
          className="flex items-center gap-1 mt-20 px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95"
        >
          Proceed to Checkout
          <ArrowRightIcon strokeWidth={3} className="w-4 h-4" />
        </button>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default SeatLayout;
