import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import React from 'react'
import BlurCircle from './BlurCircle'   // <-- also missing import in your code
import toast from 'react-hot-toast'

const DateSelect = ({ dateTime, id }) => {
    const navigate=useNavigate();
    const [selected,setSelected]=useState(null);
    const onBookHandler=()=>{
    if(!selected){
        return toast.error("Please select a date");
    }
    navigate(`/movies/${id}/${selected}`);
    scrollTo(0,0);
}
  if (!dateTime) return null; // safety check

  return (
    <div id="dateSelect" className='pt-30'>
      <div className='flex flex-col md:flex-row items-center justify-between gap-10 relative p-8 bg-primary/10 border border-primary/20 rounded-lg'>
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle top="100px" right="0px" />

        <div>
          <p className='font-semibold text-lg'>Choose a Date</p>
          <p className='text-gray-500'>Select a show date</p>

          <div className='flex items-center gap-6 text-sm mt-5'>
            <ChevronLeftIcon width={28} />
            <span className='grid grid-cols-3 md:flex flex-wrap md:max-w-lg gap-4'>
              {Object.keys(dateTime).map((date) => (
                <button onClick={() => setSelected(date)}
                  key={date}
                  className={`flex flex-col items-center justify-center h-14 w-14 aspect-square rounded cursor-pointer hover:bg-primary/20 transition ${selected === date ? 'bg-primary text-white' : "border border-primary/70"}`}
                >
                  <span>
                    {new Date(date).getDate()}  </span>
                    <span className='text-xs text-gray-400'>
                      {new Date(date).toLocaleString('en-US', { month: 'short' })}
                  
                  </span>
                </button>
              ))}
            </span>
            <ChevronRightIcon width={28} />
          </div>
        </div>

        <button onClick={onBookHandler} className='mt-6 w-full py-3 rounded bg-primary text-white px-8 hover:bg-primary/90 transition-all cursor-pointer'>
          Book Now
        </button>
      </div>
    </div>
  )
}

export default DateSelect;
