import { useEffect, useState } from "react";

// Loader while data is fetching
import Loading from "../components/Loading";

// Decorative UI elements
import BlurCircle from "../components/BlurCircle";

// Utility functions
import timeFormat from "../lib/timeFormat";
import { dateFormat } from "../lib/dateFormat";

// Global app context
import { useAppContext } from "../context/AppContext";

const MyBookings = () => {
  // Currency symbol (₹, $, etc.)
  const currency = import.meta.env.VITE_CURRENCY;

  // Context values
  const { axios, getToken, user, image_base_url } = useAppContext();

  // State
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch logged-in user's bookings
  const getMyBookings = async () => {
    try {
      const { data } = await axios.get("/api/user/bookings", {
        headers: {
          Authorization: `Bearer ${await getToken()}`,
        },
      });

      if (data?.success) {
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      // Loader must stop no matter what
      setIsLoading(false);
    }
  };

  // Fetch bookings when user becomes available
  useEffect(() => {
    if (user) {
      getMyBookings();
    }
  }, [user]);

  // ================= UI =================
  if (isLoading) return <Loading />;

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]">
      {/* Background decorations */}
      <BlurCircle top="100px" left="100px" />
      <BlurCircle bottom="0px" left="600px" />

      <h1 className="text-lg font-semibold mb-4">My Bookings</h1>

      {/* Empty state */}
      {bookings.length === 0 && (
        <p className="text-gray-400 mt-10">
          You have not booked any tickets yet.
        </p>
      )}

      {/* Booking cards */}
      {bookings.map((item, index) => (
        <div
          key={index}
          className="flex flex-col md:flex-row justify-between bg-primary/8 border border-primary/20 rounded-lg mt-4 p-2 max-w-3xl"
        >
          {/* Movie info */}
          <div className="flex flex-col md:flex-row">
            <img
              src={
                image_base_url +
                item?.show?.movie?.poster_path
              }
              alt="poster"
              className="md:max-w-45 aspect-video h-auto object-cover object-bottom rounded"
            />

            <div className="flex flex-col p-4">
              <p className="text-lg font-semibold">
                {item?.show?.movie?.title}
              </p>

              <p className="text-gray-400 text-sm">
                {timeFormat(item?.show?.movie?.runtime)}
              </p>

              <p className="text-gray-400 text-sm mt-auto">
                {dateFormat(item?.show?.showDateTime)}
              </p>
            </div>
          </div>

          {/* Booking details */}
          <div className="flex flex-col md:items-end md:text-right justify-between p-4">
            <div className="flex items-center gap-4">
              <p className="text-2xl font-semibold mb-3">
                {currency}
                {item?.amount}
              </p>

              {/* Payment disabled (placeholder) */}
              {!item?.isPaid && (
                <button
                  className="bg-primary px-4 py-1.5 mb-3 text-sm rounded-full font-medium cursor-not-allowed opacity-70"
                  title="Payment integration disabled"
                >
                  Payment Pending
                </button>
              )}
            </div>

            {/* Seat info */}
            <div className="text-sm">
              <p>
                <span className="text-gray-400">Total Tickets:</span>{" "}
                {item?.bookedSeats?.length || 0}
              </p>

              <p>
                <span className="text-gray-400">Seat Number:</span>{" "}
                {item?.bookedSeats?.join(", ")}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MyBookings;
