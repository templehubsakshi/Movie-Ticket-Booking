import React from 'react'
import Navbar from './components/Navbar'
import { Routes, Route, useLocation } from 'react-router-dom'
import {Toaster} from 'react-hot-toast'
import Home from './pages/Home'
import Movie from './pages/Movies'
import MovieDetails from './pages/MovieDetails'
import SeatLayout from './pages/SeatLayout'
import MyBookings from './pages/MyBookings'
import Favorite from './pages/Favorite'
import Footer from './components/Footer'
import Layout from './pages/admin/Layout'
import Dashboard from './pages/admin/Dashboard'
import AddShows from './pages/admin/AddShows'
import ListShows from './pages/admin/ListShows'
import ListBookings from './pages/admin/ListBookings'



const App = () => {

 const isAdminRoute=useLocation().pathname.startsWith('/admin');
  return (
    <div>
      <Toaster />
      {!isAdminRoute && <Navbar />}
      <Routes>

  {/* Public Routes */}
  <Route path="/" element={<Home />} />
  <Route path="/movies" element={<Movie />} />
  <Route path="/movies/:id" element={<MovieDetails />} />
  <Route path="/movies/:id/:date" element={<SeatLayout />} />
  <Route path="/my-bookings" element={<MyBookings />} />
  <Route path="/favorite" element={<Favorite />} />

  {/* Admin Routes WITH SIDEBAR */}
  <Route path="/admin" element={<Layout />}>
      <Route index element={<Dashboard />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="add-shows" element={<AddShows />} />
      <Route path="list-shows" element={<ListShows />} />
      <Route path="list-bookings" element={<ListBookings />} />
  </Route>
      </Routes>
      {!isAdminRoute && <Footer />}
    </div>
  )
}

export default App