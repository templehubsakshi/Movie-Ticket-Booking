import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import BlurCircle from "../components/BlurCircle";
import { UserIcon, SaveIcon, CameraIcon } from "lucide-react";
import toast from "react-hot-toast";

const Profile = () => {
  const { user, setUser, axios } = useAppContext();

  const [name,    setName]    = useState(user?.name  || "");
  const [image,   setImage]   = useState(user?.image || "");
  const [saving,  setSaving]  = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Name cannot be empty");
    try {
      setSaving(true);
      const { data } = await axios.put("/api/user/update-profile", { name, image });
      if (data.success) {
        // Update user in context so Navbar avatar refreshes
        if (typeof setUser === "function") setUser(data.user);
        toast.success("Profile updated!");
      } else {
        toast.error(data.message || "Update failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center px-6 py-40 overflow-hidden">
      <BlurCircle top="-100px" left="-100px" />
      <BlurCircle bottom="0" right="0" />

      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 z-10">
        <h1 className="text-2xl font-semibold mb-6">My Profile</h1>

        {/* Avatar preview */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-24 h-24 rounded-full bg-primary/20 overflow-hidden flex items-center justify-center ring-2 ring-primary/30">
            {image ? (
              <img src={image} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-10 h-10 text-primary/60" />
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <CameraIcon className="w-3 h-3" /> Paste an image URL below to update
          </p>
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-5">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm
                placeholder-gray-600 focus:outline-none focus:border-primary/50 transition"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Avatar Image URL</label>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm
                placeholder-gray-600 focus:outline-none focus:border-primary/50 transition"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Email</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm
                text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-600 mt-1">Email cannot be changed</p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 w-full py-3 text-sm bg-primary hover:bg-primary-dull
              transition rounded-lg font-medium cursor-pointer disabled:opacity-60 mt-2"
          >
            <SaveIcon className="w-4 h-4" />
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
