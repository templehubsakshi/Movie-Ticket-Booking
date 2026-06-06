import { useNavigate } from "react-router-dom";
import BlurCircle from "../components/BlurCircle";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      <BlurCircle top="-100px" left="-100px" />
      <BlurCircle bottom="0" right="0" />

      <p className="text-8xl font-bold text-primary/30 select-none">404</p>
      <h1 className="text-3xl font-bold mt-4">Page Not Found</h1>
      <p className="text-gray-400 mt-3 max-w-sm text-sm">
        The page you're looking for doesn't exist or may have been moved.
      </p>

      <div className="flex gap-4 mt-8">
        <button
          onClick={() => { navigate("/"); scrollTo(0, 0); }}
          className="px-6 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
        >
          Go Home
        </button>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 text-sm bg-gray-800 hover:bg-gray-700 transition rounded-full font-medium cursor-pointer"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default NotFound;
