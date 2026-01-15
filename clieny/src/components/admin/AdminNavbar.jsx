// React Router se Link import kar rahe hain
// Link ka use SPA (Single Page Application) me page reload ke bina
// route change karne ke liye hota hai
import { Link } from "react-router-dom";

// assets file se images import kar rahe hain
// yaha se logo aa raha hai
// ye file normally: src/assets/assets.js hoti hai
import { assets } from "../../assets/assets";

// AdminNavbar ek functional component hai
// Ye admin panel ke top navigation bar ke liye use hota hai
const AdminNavbar = () => {

  // JSX return ho raha hai
  return (
    // Ye main navbar container hai
    // flex → items ek row me aayenge
    // items-center → vertically center
    // justify-between → left aur right me space
    // h-16 → fixed height (64px)
    // border-b → neeche ek thin line (professional look)
    <div className="flex items-center justify-between px-6 md:px-10 h-16 border-b border-gray-300/30">

      {/* 
        Link component React Router ka hai
        to="/" → user ko home page par le jaata hai
        Ye <a href="/"> se better hota hai kyunki
        page reload nahi hota
      */}
      <Link to="/">

        {/* 
          Logo image
          src → assets file se aa raha hai
          alt → accessibility ke liye
          w-36 → width fix
          h-auto → height automatic
        */}
        <img
          src={assets.logo}   // <-- logo assets.js file se aa raha hai
          alt="logo"
          className="w-36 h-auto"
        />
      </Link>
    </div>
  );
};

// Is component ko dusri files me use karne ke liye export
export default AdminNavbar;
