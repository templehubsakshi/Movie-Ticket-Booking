import { Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute.jsx";

import Home          from "./pages/Home";
import Movies        from "./pages/Movies";
import MovieDetails  from "./pages/MovieDetails";
import SeatLayout    from "./pages/SeatLayout";
import MyBookings    from "./pages/MyBookings";
import Favorite      from "./pages/Favorite";
import Login         from "./pages/Login";
import Register      from "./pages/Register";
import PaymentLoading from "./pages/PaymentLoading";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

import Layout        from "./pages/admin/Layout";
import Dashboard     from "./pages/admin/Dashboard";
import AddShows      from "./pages/admin/AddShows";
import ListShows     from "./pages/admin/ListShows";
import ListBookings  from "./pages/admin/ListBookings";
import ManageUsers   from "./pages/admin/ManageUsers"; // NEW

const App = () => {
  const isAdminRoute = useLocation().pathname.startsWith("/admin");

  return (
    <>
      <Toaster position="top-center" />
      {!isAdminRoute && <Navbar />}

      <Routes>
        {/* Public routes */}
        <Route path="/"              element={<Home />} />
        <Route path="/movies"        element={<Movies />} />
        <Route path="/movies/:id"    element={<MovieDetails />} />
        <Route path="/login"         element={<Login />} />
        <Route path="/register"      element={<Register />} />

        {/* Auth-required routes */}
        <Route path="/movies/:id/:date"    element={<ProtectedRoute><SeatLayout /></ProtectedRoute>} />
        <Route path="/my-bookings"         element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
        <Route path="/favorite"            element={<ProtectedRoute><Favorite /></ProtectedRoute>} />
        <Route path="/loading/:nextUrl"    element={<ProtectedRoute><PaymentLoading /></ProtectedRoute>} />

        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Admin-only routes */}
        <Route path="/admin/*" element={<AdminRoute><Layout /></AdminRoute>}>
          <Route index              element={<Dashboard />} />
          <Route path="add-shows"   element={<AddShows />} />
          <Route path="list-shows"  element={<ListShows />} />
          <Route path="list-bookings" element={<ListBookings />} />
          <Route path="manage-users"  element={<ManageUsers />} /> {/* NEW */}
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>

      {!isAdminRoute && <Footer />}
    </>
  );
};

export default App;
