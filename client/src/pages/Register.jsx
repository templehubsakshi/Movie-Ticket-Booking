import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Film } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";

// LOW-12: basic email format regex used for client-side validation.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Register = () => {
  const { axios, login } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || "/";

  const [form, setForm]       = useState({ name: "", email: "", password: "" });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim())             e.name     = "Name is required";
    if (!form.email)                   e.email    = "Email is required";
    // LOW-12 fix: validate email format, not just presence.
    else if (!EMAIL_RE.test(form.email)) e.email  = "Enter a valid email address";
    if (form.password.length < 6)      e.password = "Password must be at least 6 characters";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await axios.post("/api/auth/register", form);
      if (data.success) {
        login(data.user);
        toast.success(`Account created! Welcome, ${data.user.name}!`);
        navigate(from, { replace: true });
      } else {
        toast.error(data.message || "Registration failed");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const pwStrength = form.password.length === 0 ? 0
    : form.password.length < 6  ? 1
    : form.password.length < 10 ? 2
    : 3;
  const pwColors = ["", "bg-red-500", "bg-yellow-400", "bg-green-500"];
  const pwLabels = ["", "Weak", "Fair", "Strong"];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 text-primary">
            <Film className="w-8 h-8" />
            <span className="text-2xl font-bold tracking-tight">QuickShow</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold mb-1">Create account</h1>
          <p className="text-gray-400 text-sm mb-7">
            Already have an account?{" "}
            <Link to="/login" state={{ from }} className="text-primary hover:underline">
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            {/* Name */}
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Full name</label>
              <input
                name="name"
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
                className={`w-full bg-white/8 border rounded-lg px-4 py-3 text-sm outline-none
                  focus:border-primary transition placeholder-gray-600
                  ${errors.name ? "border-red-500" : "border-white/15"}`}
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Email address</label>
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                className={`w-full bg-white/8 border rounded-lg px-4 py-3 text-sm outline-none
                  focus:border-primary transition placeholder-gray-600
                  ${errors.email ? "border-red-500" : "border-white/15"}`}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  className={`w-full bg-white/8 border rounded-lg px-4 py-3 pr-11 text-sm outline-none
                    focus:border-primary transition placeholder-gray-600
                    ${errors.password ? "border-red-500" : "border-white/15"}`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength bar */}
              {form.password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map((lvl) => (
                      <div
                        key={lvl}
                        className={`h-1 flex-1 rounded-full transition-all duration-300
                          ${pwStrength >= lvl ? pwColors[pwStrength] : "bg-white/15"}`}
                      />
                    ))}
                  </div>
                  <span className={`text-xs font-medium ${
                    pwStrength === 1 ? "text-red-400"
                    : pwStrength === 2 ? "text-yellow-400"
                    : "text-green-400"
                  }`}>
                    {pwLabels[pwStrength]}
                  </span>
                </div>
              )}
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 bg-primary hover:bg-primary-dull transition rounded-full py-3 font-semibold
                text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-[.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
