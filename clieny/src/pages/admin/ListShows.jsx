// React ke hooks import kar rahe hain
// useState -> component ke andar data (state) store karne ke liye
// useEffect -> component load hone ke baad side effects (API call) ke liye
import { useEffect, useState } from "react";

// Jab data load ho raha ho tab spinner / loader dikhane ke liye
import Loading from "../../components/Loading";

// Admin pages ka common title component
import Title from "../../components/admin/Title";

// Date ko readable format (dd-mm-yyyy time) me convert karne wala helper
import { dateFormat } from "../../lib/dateFormat";

// Global App Context jahan se axios, token aur user milta hai
import { useAppContext } from "../../context/AppContext";


// ================= COMPONENT START =================
const ListShows = () => {

  // Context se required cheezein nikaal rahe hain
  // axios  -> backend API call ke liye
  // getToken -> JWT token lene ke liye (authorization)
  // user -> currently logged-in user (admin hona chahiye)
  const { axios, getToken, user } = useAppContext();

  // Environment variable se currency symbol le rahe hain
  // Example: ₹ or $
  const currency = import.meta.env.VITE_CURRENCY;

  // Saare shows backend se aayenge aur is state me store honge
  const [shows, setShows] = useState([]);

  // Loading state -> jab tak data nahi aata tab tak true rahega
  const [loading, setLoading] = useState(true);


  // ================= API CALL FUNCTION =================
  // Ye function admin ke saare movie shows backend se fetch karega
  const getAllShow = async () => {
    try {
      // Backend ko GET request bhej rahe hain
      // Route: /api/admin/all-shows
      // Header me Authorization token bhejna zaroori hai
      const { data } = await axios.get("/api/admin/all-shows", {
        headers: {
          Authorization: `Bearer ${await getToken()}`, // JWT token
        },
      });

      // Backend se jo shows aaye unko state me store kar diya
      setShows(data.shows);

      // Data aa gaya -> loading band
      setLoading(false);
    } catch (error) {
      // Agar API fail ho jaaye to error console me dikhega
      console.error(error);
    }
  };


  // ================= useEffect =================
  // Jab component load ho aur user available ho
  // tab hi API call karni hai
  useEffect(() => {
    if (user) {
      getAllShow();
    }
  }, [user]); // user change hone par effect dobara chalega


  // ================= UI RENDERING =================
  // Agar loading false hai -> table dikhao
  // warna -> Loading component
  return !loading ? (
    <>
      {/* Page ka heading */}
      <Title text1="List" text2="Shows" />

      {/* Table container */}
      <div className="max-w-4xl mt-6 overflow-x-auto">
        <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">

          {/* ================= TABLE HEADER ================= */}
          <thead>
            <tr className="bg-primary/20 text-left text-white">
              <th className="p-2 font-medium pl-5">Movie Name</th>
              <th className="p-2 font-medium">Show Time</th>
              <th className="p-2 font-medium">Total Bookings</th>
              <th className="p-2 font-medium">Earnings</th>
            </tr>
          </thead>

          {/* ================= TABLE BODY ================= */}
          <tbody>
            {shows.map((show, index) => (
              <tr
                key={index}
                className="border-b border-primary/10 bg-primary/5 even:bg-primary/10"
              >

                {/* Movie ka naam */}
                <td className="p-2 min-w-45 pl-5">
                  {show.movie.title}
                </td>

                {/* Show ka date aur time (formatted) */}
                <td className="p-2">
                  {dateFormat(show.showDateTime)}
                </td>

                {/* 
                  Total bookings:
                  occupiedSeats ek object hota hai
                  uske keys ki length = booked seats count
                */}
                <td className="p-2">
                  {Object.keys(show.occupiedSeats).length}
                </td>

                {/* 
                  Earnings calculation:
                  total booked seats × show price
                */}
                <td className="p-2">
                  {currency}{" "}
                  {Object.keys(show.occupiedSeats).length * show.showPrice}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  ) : (
    // Jab data load ho raha ho tab ye dikhaya jayega
    <Loading />
  );
};


// Component export kar rahe hain taaki routes me use ho sake
export default ListShows;
