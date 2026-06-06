import { LayoutDashboardIcon, PlusSquareIcon, ListIcon, ListCollapseIcon, UsersIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { assets } from "../../assets/assets";

const AdminSidebar = () => {
  const adminNavLinks = [
    { name: "Dashboard",     path: "/admin",              icon: LayoutDashboardIcon },
    { name: "Add Shows",     path: "/admin/add-shows",    icon: PlusSquareIcon      },
    { name: "List Shows",    path: "/admin/list-shows",   icon: ListIcon            },
    { name: "List Bookings", path: "/admin/list-bookings",icon: ListCollapseIcon    },
    // NEW: User management link
    { name: "Manage Users",  path: "/admin/manage-users", icon: UsersIcon           },
  ];

  return (
    <div className="h-[calc(100vh-64px)] md:flex flex-col items-center pt-8 max-w-13 md:max-w-60 w-full border-r border-gray-300/20 text-sm">
      <img
        className="h-9 md:h-14 w-9 md:w-14 rounded-full mx-auto"
        src={assets.profile}
        alt="admin"
      />
      <p className="mt-2 text-base max-md:hidden">Admin Panel</p>

      <div className="w-full">
        {adminNavLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            end={link.path === "/admin"} // sirf exact /admin pe active mark karo
            className={({ isActive }) =>
              `relative flex items-center max-md:justify-center gap-2 w-full py-2.5 md:pl-10 first:mt-6 text-gray-400
              ${isActive ? "bg-primary/15 text-primary" : ""}`
            }
          >
            {({ isActive }) => (
              <>
                <link.icon className="w-5 h-5" />
                <p className="max-md:hidden">{link.name}</p>
                <span className={`w-1.5 h-10 rounded-1 right-0 absolute ${isActive ? "bg-primary" : ""}`} />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default AdminSidebar;
