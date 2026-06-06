import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import BlurCircle from "./BlurCircle";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

// Parse "YYYY-MM-DD" as LOCAL date (avoids UTC midnight → prev day in negative-offset timezones)
const parseLocalDate = (dateStr) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const DateSelect = ({ dateTime, id }) => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const onBookHandler = () => {
    if (!selected) return toast("Please select a date");
    navigate(`/movies/${id}/${selected}`);
    scrollTo(0, 0);
  };

  return (
    <div id="dateSelect" className="pt-30">
      <div className="flex flex-col md:flex-row items-center justify-between gap-10 relative p-8 bg-primary/10 border border-primary/20 rounded-lg">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle top="100px" right="0" />

        <div>
          <p className="text-lg font-semibold">Choose Date</p>
          <div className="flex items-center gap-6 text-sm mt-5">
            <ChevronLeftIcon width={28} />
            <span className="grid grid-cols-3 md:flex flex-wrap md:max-w-lg gap-4">
              {dateTime &&
                Object.keys(dateTime).map((date) => {
                  const localDate = parseLocalDate(date);
                  return (
                    <button
                      key={date}
                      onClick={() => setSelected(date)}
                      className={`flex flex-col items-center justify-center h-14 w-14 aspect-square rounded cursor-pointer ${
                        selected === date
                          ? "bg-primary text-white"
                          : "border border-primary/70"
                      }`}
                    >
                      <span>{localDate.getDate()}</span>
                      <span>
                        {localDate.toLocaleString("en-US", { month: "short" })}
                      </span>
                    </button>
                  );
                })}
            </span>
            <ChevronRightIcon width={28} />
          </div>
        </div>

        <button
          onClick={onBookHandler}
          className="bg-primary text-white px-8 py-2 mt-6 rounded hover:bg-primary/90 transition-all cursor-pointer"
        >
          Book Now
        </button>
      </div>
    </div>
  );
};

export default DateSelect;
