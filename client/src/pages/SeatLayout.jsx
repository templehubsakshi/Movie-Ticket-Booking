import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assets } from "../assets/assets";
import Loading from "../components/Loading";
import BlurCircle from "../components/BlurCircle";
import { ArrowRightIcon, ClockIcon, CalendarX2Icon } from "lucide-react";
import isoTimeFormat from "../lib/isoTimeFormat";
import toast from "react-hot-toast";
import { useAppContext } from "../context/AppContext";

// MED-03 fix: single source of truth for seat column count.
// Previously the count=9 default in renderSeats was a magic number duplicated
// implicitly by the backend SEAT_RE regex (/^[A-J][1-9]$/).
// Change this constant to change the layout; update SEAT_RE in bookingController.js too.
const SEAT_COLS = 9;

const SeatLayout = () => {
  const groupRows = [
    ["A", "B"],
    ["C", "D"],
    ["E", "F"],
    ["G", "H"],
    ["I", "J"],
  ];

  const { id, date } = useParams();
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedTime, setSelectedTime]   = useState(null);
  const [show, setShow]                   = useState(null);
  const [occupiedSeats, setOccupiedSeats] = useState([]);

  const navigate = useNavigate();
  const { axios, user } = useAppContext();

  const getShow = async () => {
    try {
      const { data } = await axios.get(`/api/show/${id}`);
      if (data.success) setShow(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSeatClick = (seatId) => {
    if (!selectedTime) return toast("Please select a showtime first");
    if (occupiedSeats.includes(seatId)) return toast("This seat is already booked");
    if (!selectedSeats.includes(seatId) && selectedSeats.length >= 5) {
      return toast("You can only select up to 5 seats");
    }
    setSelectedSeats((prev) =>
      prev.includes(seatId) ? prev.filter((s) => s !== seatId) : [...prev, seatId]
    );
  };

  // MED-03 fix: use SEAT_COLS constant instead of magic number 9
  const renderSeats = (row) => (
    <div key={row} className="flex gap-2 mt-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: SEAT_COLS }, (_, i) => {
          const seatId = `${row}${i + 1}`;
          const isOccupied = occupiedSeats.includes(seatId);
          const isSelected = selectedSeats.includes(seatId);
          return (
            <button
              key={seatId}
              onClick={() => handleSeatClick(seatId)}
              disabled={isOccupied}
              className={`h-8 w-8 rounded border border-primary/60 cursor-pointer
                ${isSelected  ? "bg-primary text-white" : ""}
                ${isOccupied  ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              {seatId}
            </button>
          );
        })}
      </div>
    </div>
  );

  const getOccupiedSeats = async () => {
    try {
      const { data } = await axios.get(`/api/booking/seats/${selectedTime.showId}`);
      if (data.success) setOccupiedSeats(data.occupiedSeats);
      else toast.error(data.message);
    } catch (error) {
      console.error(error);
    }
  };

  const bookTickets = async () => {
    try {
      if (!user)         return toast.error("Please login to proceed");
      if (!selectedTime) return toast.error("Please select a showtime");
      if (!selectedSeats.length) return toast.error("Please select at least one seat");

      const { data } = await axios.post("/api/booking/create", {
        showId: selectedTime.showId,
        selectedSeats,
      });

      if (data.success) {
        window.location.href = data.url;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Booking failed. Please try again.");
    }
  };

  useEffect(() => { getShow(); }, [id]);

  useEffect(() => {
    if (selectedTime) {
      setSelectedSeats([]);
      getOccupiedSeats();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTime]);

  if (!show) return <Loading />;

  const timingsForDate = show.dateTime?.[date];

  return (
    <div className="flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-30 md:pt-50">

      {/* Timings sidebar */}
      <div className="w-60 bg-primary/10 border border-primary/20 rounded-lg py-10 h-max md:sticky md:top-30">
        <p className="text-lg font-semibold px-6">Available Timings</p>

        {!timingsForDate || timingsForDate.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 mt-6 text-gray-400 text-sm text-center">
            <CalendarX2Icon className="w-8 h-8 text-gray-500" />
            <p>No showtimes available for this date.</p>
            <button
              onClick={() => { navigate(`/movies/${id}`); scrollTo(0, 0); }}
              className="mt-2 text-primary hover:underline text-xs"
            >
              ← Pick another date
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-1">
            {timingsForDate.map((item) => (
              <div
                key={item.time}
                onClick={() => setSelectedTime(item)}
                className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md cursor-pointer transition
                  ${selectedTime?.time === item.time ? "bg-primary text-white" : "hover:bg-primary/20"}
                `}
              >
                <ClockIcon className="w-4 h-4" />
                <p className="text-sm">{isoTimeFormat(item.time)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seat layout */}
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

        {selectedSeats.length > 0 && (
          <p className="mt-6 text-sm text-gray-400">
            Selected: <span className="text-white font-medium">{selectedSeats.join(", ")}</span>
          </p>
        )}

        <button
          onClick={bookTickets}
          className="flex items-center gap-1 mt-8 px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95"
        >
          Proceed to Checkout
          <ArrowRightIcon strokeWidth={3} className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SeatLayout;
