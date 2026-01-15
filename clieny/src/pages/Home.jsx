import React from "react";
// React import kiya gaya, kyunki ye component JSX use karega

import HeroSection from "../components/HeroSection"; 
// HeroSection component ko import kiya → ye usually hero banner/slider hota hai
// Data source: agar backend se movie ya featured data aa raha, toh HeroSection me axios/fetch call hoga

import FeaturedSection from "../components/FeaturedSection";
// FeaturedSection component → top movies ya now-playing movies show karega
// Data source: backend route `/api/show/now-playing` ya `/api/show/all`
// Important: yaha fetch call aur state me store karna padega, otherwise empty render ho sakta hai

import TrailersSection from "../components/TrailersSection";
// TrailersSection → movies ke trailers ya upcoming releases show karega
// Data source: backend me `Show` + `Movie` model data, ya koi external API (TMDB)

// Main functional component
const Home = () => {
  return (
    <>
      <HeroSection /> 
      {/* Hero section render hoga */}
      <FeaturedSection />
      {/* Featured movies show honge */}
      <TrailersSection />
      {/* Trailers / upcoming shows */}
    </>
  );
};

export default Home;
// Component export kiya, jisse App.jsx me use kiya ja sake
