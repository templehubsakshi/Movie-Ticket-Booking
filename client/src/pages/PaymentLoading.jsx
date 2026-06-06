import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

/**
 * Post-payment redirect page.
 * Stripe redirects to /loading/<nextUrl> on success.
 * We wait briefly (to let the webhook fire) then redirect.
 */
const PaymentLoading = () => {
  const { nextUrl } = useParams();
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(3);

  useEffect(() => {
    if (seconds <= 0) {
      navigate(`/${nextUrl}`);
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, navigate, nextUrl]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
      {/* Pulsing ring */}
      <div className="relative flex items-center justify-center">
        <span className="absolute inline-flex h-20 w-20 rounded-full bg-primary opacity-30 animate-ping" />
        <span className="relative inline-flex rounded-full h-14 w-14 bg-primary animate-pulse" />
      </div>

      <h2 className="text-xl font-semibold">Payment Confirmed!</h2>
      <p className="text-gray-400 text-sm">
        Redirecting you in{" "}
        <span className="text-primary font-bold">{seconds}</span> second
        {seconds !== 1 ? "s" : ""}…
      </p>
    </div>
  );
};

export default PaymentLoading;
