import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { SearchIcon, XIcon, MenuIcon, TicketPlus, LogOut, UserIcon } from "lucide-react";
import { useAppContext } from "../context/AppContext";

const NAV_LINKS = [
  { label: "Home",      to: "/" },
  { label: "Movies",    to: "/movies" },
  { label: "Favorites", to: "/favorite" },
];

const Navbar = () => {
  const [isOpen,       setIsOpen]       = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate    = useNavigate();

  const { user, logout } = useAppContext();

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <nav className="fixed top-0 left-0 z-50 w-full flex items-center justify-between px-6 md:px-16 lg:px-36 py-5">

      {/* Logo */}
      <div />

      {/* Nav links */}
      <div
        className={`max-md:absolute max-md:top-0 max-md:left-0 max-md:font-medium max-md:text-lg
          z-50 flex flex-col md:flex-row items-center max-md:justify-center gap-8
          md:px-8 py-3 max-md:h-screen md:rounded-full
          backdrop-blur-md bg-black/70 md:bg-white/10 md:border border-gray-300/20
          overflow-hidden transition-all duration-300
          ${isOpen ? "max-md:w-full max-md:opacity-100" : "max-md:w-0 max-md:opacity-0"}
        `}
      >
        <XIcon
          className="md:hidden absolute top-6 right-6 w-6 h-6 cursor-pointer"
          onClick={() => setIsOpen(false)}
        />

        {NAV_LINKS.map(({ label, to }) => (
          <NavLink
            key={label}
            to={to}
            end={to === "/"}
            onClick={() => { scrollTo(0, 0); setIsOpen(false); }}
            className={({ isActive }) =>
              `transition-colors duration-200 ${
                isActive ? "text-primary font-semibold" : "hover:text-primary/80"
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-6">
        <SearchIcon className="max-md:hidden w-5 h-5 cursor-pointer hover:text-primary transition" />

        {!user ? (
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-1 sm:px-7 sm:py-2 bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer text-sm"
          >
            Login
          </button>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-white
                font-semibold text-sm cursor-pointer hover:bg-primary-dull transition ring-2 ring-transparent
                hover:ring-primary/40"
              aria-label="User menu"
            >
              {user.image ? (
                <img src={user.image} alt={user.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                user.name?.charAt(0).toUpperCase()
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-black/90 border border-white/10 rounded-xl
                shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-sm font-semibold truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                  {user.isAdmin && (
                    <span className="inline-block mt-1.5 text-[10px] font-medium bg-primary/20 text-primary
                      border border-primary/30 rounded-full px-2 py-0.5">
                      Admin
                    </span>
                  )}
                </div>

                <button
                  onClick={() => { setDropdownOpen(false); navigate("/my-bookings"); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-white/8 transition cursor-pointer"
                >
                  <TicketPlus className="w-4 h-4 text-gray-400" />
                  My Bookings
                </button>

                <button
                  onClick={() => { setDropdownOpen(false); navigate("/profile"); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-white/8 transition cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-gray-400" />
                  My Profile
                </button>

                {user.isAdmin && (
                  <button
                    onClick={() => { setDropdownOpen(false); navigate("/admin"); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-white/8 transition cursor-pointer"
                  >
                    <SearchIcon className="w-4 h-4 text-gray-400" />
                    Admin Panel
                  </button>
                )}

                <div className="border-t border-white/10 mt-1" />

                <button
                  onClick={() => { setDropdownOpen(false); logout(); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-400
                    hover:bg-red-500/10 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}

        <MenuIcon
          className="md:hidden w-7 h-7 cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        />
      </div>
    </nav>
  );
};

export default Navbar;
