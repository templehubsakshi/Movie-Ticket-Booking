import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { CheckCircle2Icon, ClockIcon, CopyIcon, UserIcon } from "lucide-react";
import Loading from "../components/Loading";
import BlurCircle from "../components/BlurCircle";
import isoTimeFormat from "../lib/isoTimeFormat";
import { useAppContext } from "../context/AppContext";

// Simple live-ish status without a websocket/SSE layer: poll every 5s. Good
// enough for the group-status "who's paid" view without adding a socket
// server, room-per-code management, or a client socket dependency — the
// next real step for this feature if it needed true real-time updates.
const POLL_INTERVAL_MS = 5000;

const statusLabel = {
  active: "Open — claim your seat",
  extended: "Open (extended) — claim your seat",
  awaiting_decision: "Waiting on the organizer",
  completed: "Booking complete",
  expired: "Expired",
  cancelled: "Cancelled",
};

// Statuses in which the claim/pay flow is still open.
const OPEN_STATUSES = ["active", "extended"];

const formatCountdown = (targetIso) => {
  if (!targetIso) return null;
  const ms = new Date(targetIso).getTime() - Date.now();
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const GroupBooking = () => {
  const { code } = useParams();
  const { axios } = useAppContext();

  const [groupBooking, setGroupBooking] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [pendingSeats, setPendingSeats] = useState([]); // seats being claimed/paid right now
  const [, setTick]                     = useState(0);  // forces countdown re-render every second
  const pollRef = useRef(null);

  const fetchGroupBooking = async ({ silent } = {}) => {
    try {
      if (!silent) setLoading(true);
      const { data } = await axios.get(`/api/group-booking/${code}`);
      if (data.success) setGroupBooking(data.groupBooking);
      else if (!silent) toast.error(data.message);
    } catch (error) {
      if (!silent) toast.error(error.response?.data?.message || "Could not load this group booking.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupBooking();
    pollRef.current = setInterval(() => fetchGroupBooking({ silent: true }), POLL_INTERVAL_MS);
    const secondTick = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      clearInterval(pollRef.current);
      clearInterval(secondTick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const claimSeat = async (seat) => {
    try {
      setPendingSeats((p) => [...p, seat]);
      const { data } = await axios.post(`/api/group-booking/${code}/claim`, { seats: [seat] });
      if (data.success) {
        toast.success(`Claimed ${seat}`);
        fetchGroupBooking({ silent: true });
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not claim that seat.");
    } finally {
      setPendingSeats((p) => p.filter((s) => s !== seat));
    }
  };

  const payForMySeats = async () => {
    const mySeats = Object.entries(groupBooking.claims)
      .filter(([, c]) => c.isYou && c.status === "claimed")
      .map(([seat]) => seat);

    if (!mySeats.length) return toast("Claim a seat first");

    try {
      setPendingSeats((p) => [...p, ...mySeats]);
      const { data } = await axios.post(`/api/group-booking/${code}/pay`, { seats: mySeats });
      if (data.success) {
        window.location.href = data.url;
      } else {
        toast.error(data.message);
        setPendingSeats((p) => p.filter((s) => !mySeats.includes(s)));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not start payment.");
      setPendingSeats((p) => p.filter((s) => !mySeats.includes(s)));
    }
  };

  const decide = async (action) => {
    try {
      const { data } = await axios.post(`/api/group-booking/${code}/decide`, { action });
      if (data.success) {
        toast.success(action === "extend" ? "Timer extended" : "Continuing with who's paid");
        fetchGroupBooking({ silent: true });
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not apply that decision.");
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied");
  };

  if (loading) return <Loading />;
  if (!groupBooking) return null;

  const { claims, status, expiresAt, decisionDeadline, isOrganizer,
          organizerName, movieTitle, showDateTime, pricePerSeat,
          extensionsUsed, maxExtensions } = groupBooking;

  const seatEntries = Object.entries(claims);
  const paidCount   = seatEntries.filter(([, c]) => c.status === "paid").length;
  const mySeats     = seatEntries.filter(([, c]) => c.isYou);
  const myUnpaidClaimed = mySeats.filter(([, c]) => c.status === "claimed");
  const countdownTarget = status === "awaiting_decision" ? decisionDeadline : expiresAt;
  const countdown = [...OPEN_STATUSES, "awaiting_decision"].includes(status) ? formatCountdown(countdownTarget) : null;

  return (
    <div className="relative px-6 md:px-16 lg:px-40 py-30 md:pt-50">
      <BlurCircle top="-100px" left="-100px" />
      <BlurCircle bottom="0" right="0" />

      <div className="max-w-2xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{movieTitle}</h1>
            {showDateTime && (
              <p className="text-gray-400 text-sm mt-1">
                {new Date(showDateTime).toLocaleDateString()} · {isoTimeFormat(showDateTime)}
              </p>
            )}
            <p className="text-gray-400 text-sm mt-1">Organized by {organizerName}</p>
          </div>

          <button
            onClick={copyLink}
            className="flex items-center gap-1 text-xs border border-primary/40 rounded-full px-3 py-1.5 hover:bg-primary/10 shrink-0"
          >
            <CopyIcon className="w-3.5 h-3.5" /> Copy link
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-6">
          <span className="text-sm px-3 py-1 rounded-full bg-primary/20 text-primary font-medium">
            {statusLabel[status] ?? status}
          </span>
          {countdown && (
            <span className="flex items-center gap-1 text-sm text-gray-400">
              <ClockIcon className="w-4 h-4" /> {countdown}
            </span>
          )}
          <span className="text-sm text-gray-400">
            {paidCount}/{seatEntries.length} seats paid · ${pricePerSeat}/seat
          </span>
        </div>

        {/* Seat grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-8">
          {seatEntries.map(([seat, c]) => {
            const isBusy = pendingSeats.includes(seat);
            const canClaim = OPEN_STATUSES.includes(status) && c.status === "unclaimed" && !isBusy;
            return (
              <div
                key={seat}
                onClick={() => canClaim && claimSeat(seat)}
                className={`rounded-lg border p-3 flex flex-col items-center gap-1 text-xs
                  ${c.status === "paid"      ? "border-green-500/60 bg-green-500/10" : ""}
                  ${c.status === "claimed"   ? "border-primary/60 bg-primary/10" : ""}
                  ${c.status === "unclaimed" ? "border-gray-600 border-dashed" : ""}
                  ${c.status === "released"  ? "border-gray-700 bg-gray-800/40 opacity-60" : ""}
                  ${canClaim ? "cursor-pointer hover:border-primary" : ""}
                  ${isBusy ? "opacity-50" : ""}
                `}
              >
                <span className="font-semibold">{seat}</span>
                {c.status === "paid" && <CheckCircle2Icon className="w-4 h-4 text-green-500" />}
                {c.status === "claimed" || c.status === "paid" ? (
                  <span className="flex items-center gap-1 text-gray-300 truncate max-w-full">
                    <UserIcon className="w-3 h-3" />
                    {c.isYou ? "You" : c.userName ?? "Friend"}
                  </span>
                ) : c.status === "released" ? (
                  <span className="text-gray-500">Released</span>
                ) : (
                  <span className="text-gray-500">{OPEN_STATUSES.includes(status) ? "Tap to claim" : "Open"}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Pay button — only if you have claimed-but-unpaid seats */}
        {OPEN_STATUSES.includes(status) && myUnpaidClaimed.length > 0 && (
          <button
            onClick={payForMySeats}
            disabled={pendingSeats.length > 0}
            className="mt-8 w-full sm:w-auto px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95 disabled:opacity-50"
          >
            Pay for your {myUnpaidClaimed.length} seat{myUnpaidClaimed.length > 1 ? "s" : ""}
            {" "}(${pricePerSeat * myUnpaidClaimed.length})
          </button>
        )}

        {/* Organizer decision — mixed paid/unpaid at expiry */}
        {status === "awaiting_decision" && (
          <div className="mt-8 border border-primary/30 rounded-lg p-5">
            <p className="text-sm text-gray-300">
              Time's up and not everyone paid. {paidCount} seat{paidCount !== 1 ? "s" : ""} paid, the rest didn't.
            </p>
            {isOrganizer ? (
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={() => decide("continue")}
                  className="px-6 py-2 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium"
                >
                  Continue with {paidCount} paid, release the rest
                </button>
                <button
                  onClick={() => decide("extend")}
                  disabled={extensionsUsed >= maxExtensions}
                  className="px-6 py-2 text-sm border border-primary/60 hover:bg-primary/10 transition rounded-full font-medium disabled:opacity-40"
                  title={extensionsUsed >= maxExtensions ? "This group already used its one extension" : undefined}
                >
                  Give everyone more time
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-400 mt-3">Waiting on {organizerName} to decide what happens next.</p>
            )}
          </div>
        )}

        {status === "expired" && (
          <p className="mt-8 text-sm text-gray-400">
            This group booking expired before anyone paid, and the seats were released.
          </p>
        )}
      </div>
    </div>
  );
};

export default GroupBooking;
