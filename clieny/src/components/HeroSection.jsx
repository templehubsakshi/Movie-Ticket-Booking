import React from 'react'
import darknightlogo from '../assets/darknightlogo.png'
import { CalendarIcon,ClockIcon,ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const HeroSection = () => {
  const navigate=useNavigate();
  return (
    <div className='flex flex-col items-start justify-center gap-4 px-6 md:px-16 lg:px-36 bg-[url(/background-img.jpg)] bg-cover bg-center h-screen'>
        <img src={darknightlogo} alt="" className='max-h-11 lg:h-11 mt-20' />
        <h1 className='text-5xl md:text-[70 px] md:leading-18 font-semibold max-w-110'>Guardians<br /> of the Galaxy</h1>
        <div className='flex items-center gap-4 text-black'>
<span>Action/Aventure/Sci-Fi</span>
       
        <div className='flex items-center gap-1'>
        <CalendarIcon className='w-6 h-6' />2018
        </div>
        <div className='flex items-center gap-1'>
          <ClockIcon className='w-6 h-6' />2h 30m
    </div>
    </div>
    <p className='max-w-md text-black'>In a race against time, the Guardians must fight to keep the universe safe from the brink of destruction. galaxy king image is the best movie of the month </p>
    <button onClick={() => navigate('/movies')} className='bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-500 flex items-center gap-2 hover:bg-primary-dulll rounded:full'>
      Explore Movies
      <ArrowRight className="w-5 h-5" />
    </button>
    </div>
  )
}

export default HeroSection
//slidingbala