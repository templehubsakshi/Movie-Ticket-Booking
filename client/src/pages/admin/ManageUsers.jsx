import { useEffect, useState } from "react";
import Loading from "../../components/Loading";
import Title from "../../components/admin/Title";
import { ShieldCheck, ShieldOff, Search } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import toast from "react-hot-toast";

const ManageUsers = () => {
  const { axios, user: currentUser } = useAppContext();

  const [users, setUsers]         = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch]       = useState("");
  const [toggling, setToggling]   = useState(null); // userId jiska toggle chal raha hai

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get("/api/admin/users");
      if (data.success) setUsers(data.users);
      else toast.error(data.message);
    } catch (error) {
      console.error(error);
      toast.error("Could not load users.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAdmin = async (userId, userName, currentIsAdmin) => {
    if (toggling) return; // Ek toggle at a time
    setToggling(userId);
    try {
      const { data } = await axios.put(`/api/admin/users/${userId}/toggle-admin`);
      if (data.success) {
        toast.success(data.message);
        // Local state update — re-fetch ki zaroorat nahi
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, isAdmin: data.user.isAdmin } : u))
        );
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update user role.");
    } finally {
      setToggling(null);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // Search filter — name ya email se
  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <Loading />;

  return (
    <>
      <Title text1="Manage" text2="Users" />

      {/* Search bar */}
      <div className="mt-6 flex items-center gap-2 max-w-sm border border-white/15 rounded-lg px-3 py-2">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent text-sm outline-none w-full placeholder-gray-500"
        />
      </div>

      {/* Stats */}
      <div className="mt-4 flex gap-4 text-sm text-gray-400">
        <span>Total: <span className="text-white font-medium">{users.length}</span></span>
        <span>Admins: <span className="text-primary font-medium">{users.filter((u) => u.isAdmin).length}</span></span>
      </div>

      {/* Table */}
      <div className="max-w-3xl mt-4 overflow-x-auto">
        <table className="w-full border-collapse rounded-md overflow-hidden text-sm text-nowrap">
          <thead>
            <tr className="bg-primary/20 text-left text-white">
              <th className="p-2 pl-5 font-medium">Name</th>
              <th className="p-2 font-medium">Email</th>
              <th className="p-2 font-medium">Role</th>
              <th className="p-2 font-medium">Joined</th>
              <th className="p-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="font-light">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((u) => {
                const isSelf = u._id === currentUser?._id;
                const isTogglingThis = toggling === u._id;

                return (
                  <tr
                    key={u._id}
                    className="border-b border-primary/20 bg-primary/5 even:bg-primary/10"
                  >
                    <td className="p-2 pl-5">
                      {u.name}
                      {isSelf && (
                        <span className="ml-2 text-xs text-gray-500">(you)</span>
                      )}
                    </td>
                    <td className="p-2">{u.email}</td>
                    <td className="p-2">
                      {u.isAdmin ? (
                        <span className="inline-flex items-center gap-1 text-primary font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" /> Admin
                        </span>
                      ) : (
                        <span className="text-gray-400">User</span>
                      )}
                    </td>
                    <td className="p-2 text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString("en-US")}
                    </td>
                    <td className="p-2">
                      {/* Apna khud ka role nahi badal sakte */}
                      {isSelf ? (
                        <span className="text-xs text-gray-600 italic">—</span>
                      ) : (
                        <button
                          onClick={() => handleToggleAdmin(u._id, u.name, u.isAdmin)}
                          disabled={!!toggling}
                          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition
                            disabled:opacity-50 disabled:cursor-not-allowed
                            ${u.isAdmin
                              ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                              : "bg-primary/15 text-primary hover:bg-primary/25"
                            }`}
                        >
                          {isTogglingThis ? (
                            <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : u.isAdmin ? (
                            <><ShieldOff className="w-3 h-3" /> Remove Admin</>
                          ) : (
                            <><ShieldCheck className="w-3 h-3" /> Make Admin</>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ManageUsers;
