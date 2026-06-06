import { useEffect, useState } from "react";
import Loading from "../../components/Loading";
import Title from "../../components/admin/Title";
import { dateFormat } from "../../lib/dateFormat";
import { useAppContext } from "../../context/AppContext";
import { Trash2Icon } from "lucide-react";
import toast from "react-hot-toast";

const ListShows = () => {
  const { axios, user } = useAppContext();
  const currency = import.meta.env.VITE_CURRENCY;

  const [shows, setShows]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null); // showId being deleted

  const getAllShow = async () => {
    try {
      const { data } = await axios.get("/api/admin/all-shows");
      if (data.success) setShows(data.shows);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (showId, movieTitle) => {
    if (!window.confirm(`Delete the show "${movieTitle}"? This cannot be undone.`)) return;
    try {
      setDeleting(showId);
      const { data } = await axios.delete(`/api/show/${showId}`);
      if (data.success) {
        toast.success("Show deleted successfully");
        setShows((prev) => prev.filter((s) => s._id !== showId));
      } else {
        toast.error(data.message || "Failed to delete show");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete show");
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    if (user) getAllShow();
  }, [user]);

  return !loading ? (
    <>
      <Title text1="List" text2="Shows" />
      <div className="max-w-4xl mt-6 overflow-x-auto">
        <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">
          <thead>
            <tr className="bg-primary/20 text-left text-white">
              <th className="p-2 font-medium pl-5">Movie Name</th>
              <th className="p-2 font-medium">Show Time</th>
              <th className="p-2 font-medium">Total Bookings</th>
              <th className="p-2 font-medium">Earnings</th>
              <th className="p-2 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {shows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">No shows found.</td>
              </tr>
            ) : (
              shows.map((show, index) => (
                <tr key={index} className="border-b border-primary/10 bg-primary/5 even:bg-primary/10">
                  <td className="p-2 min-w-45 pl-5">{show.movie?.title}</td>
                  <td className="p-2">{dateFormat(show.showDateTime)}</td>
                  <td className="p-2">{Object.keys(show.occupiedSeats).length}</td>
                  <td className="p-2">
                    {currency}{Object.keys(show.occupiedSeats).length * show.showPrice}
                  </td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => handleDelete(show._id, show.movie?.title)}
                      disabled={deleting === show._id}
                      className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 transition disabled:opacity-40 cursor-pointer"
                      title="Delete show"
                    >
                      <Trash2Icon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  ) : (
    <Loading />
  );
};

export default ListShows;
