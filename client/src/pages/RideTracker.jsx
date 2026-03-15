import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { rideAPI } from "../api/fetch";
import useStore from "../store/useStore";
import useSocket from "../hooks/useSocket";
import RideMap from "../components/RideMap";

const STATUS_LABELS = {
  requested:   { label: "Looking for driver...", color: "text-yellow-600", icon: "🔍" },
  accepted:    { label: "Driver is on the way!", color: "text-blue-600",   icon: "🚖" },
  in_progress: { label: "Ride in progress",      color: "text-purple-600", icon: "🛣️" },
  completed:   { label: "Ride completed!",       color: "text-green-600",  icon: "✅" },
  cancelled:   { label: "Ride cancelled",        color: "text-red-600",    icon: "❌" },
};

const RideTracker = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { user, setNotification } = useStore();
  const { on, off, joinRoom, emit, trackDriver, untrackDriver } = useSocket();

  const [ride, setRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [rated, setRated] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await rideAPI.getById(rideId);
        setRide(res.data.ride);
        if (res.data.ride?.driver?.currentLocation) {
          setDriverLocation(res.data.ride.driver.currentLocation);
        }
      } catch (_) {}
      setLoading(false);
    };
    load();
    joinRoom(rideId);

    return () => {
      emit("leave_ride_room", { rideId });
    };
  }, [rideId]);

  // Socket listeners
  useEffect(() => {
    const cleanups = [
      on("ride_accepted", ({ driver }) => {
        setRide((r) => r ? { ...r, status: "accepted", driver } : r);
        setNotification("Driver found and on the way!", "success");
      }),
      on("ride_started", () => {
        setRide((r) => r ? { ...r, status: "in_progress" } : r);
        setNotification("Your ride has started!", "info");
      }),
      on("ride_completed", ({ fare }) => {
        setRide((r) => r ? { ...r, status: "completed", fare } : r);
        setNotification("Ride completed! Please rate your driver.", "success");
      }),
      on("ride_cancelled", () => {
        setRide((r) => r ? { ...r, status: "cancelled" } : r);
        setNotification("Ride was cancelled.", "error");
      }),
    ];

    return () => cleanups.forEach((fn) => typeof fn === "function" && fn());
  }, [on]);

  // Track driver's real-time location (subscribe to their tracking room)
  useEffect(() => {
    if (!ride?.driver?._id) return;
    trackDriver?.(ride.driver._id); // join tracking_${driverId} room on server
    const cleanup = on(`driver_location_${ride.driver._id}`, ({ lat, lng }) => {
      setDriverLocation({ lat, lng });
    });
    return () => {
      untrackDriver?.(ride.driver._id);
      cleanup?.();
    };
  }, [ride?.driver?._id, on]);

  const handleCancel = async () => {
    try {
      await rideAPI.cancel(rideId);
      setNotification("Ride cancelled", "info");
      navigate("/dashboard");
    } catch (err) {
      setNotification(err.response?.data?.message || "Cannot cancel now", "error");
    }
  };

  const handleRate = async (stars) => {
    try {
      await rideAPI.rate(rideId, stars);
      setRating(stars);
      setRated(true);
      setNotification("Thanks for your rating!", "success");
    } catch (_) {}
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh] text-gray-400">Loading ride...</div>;
  }

  if (!ride) {
    return <div className="text-center py-20 text-gray-400">Ride not found</div>;
  }

  const status = STATUS_LABELS[ride.status];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-5 gap-6">
        {/* Map - wider */}
        <div className="md:col-span-3 card p-0 overflow-hidden min-h-[450px]">
          <RideMap
            pickup={ride.pickup}
            destination={ride.destination}
            driverLocation={driverLocation}
            height="100%"
          />
        </div>

        {/* Right panel */}
        <div className="md:col-span-2 space-y-4">
          {/* Status */}
          <div className="card text-center py-6">
            <div className="text-4xl mb-2">{status.icon}</div>
            <p className={`font-bold text-lg ${status.color}`}>{status.label}</p>
          </div>

          {/* Ride info */}
          <div className="card space-y-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Pickup</p>
              <p className="text-sm font-medium">{ride.pickup?.address}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Destination</p>
              <p className="text-sm font-medium">{ride.destination?.address}</p>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-500">{ride.distanceKm} km · {ride.vehicleType}</span>
              <span className="font-bold text-orange-500 text-lg">₹{ride.fare}</span>
            </div>
          </div>

          {/* Driver info */}
          {ride.driver && (
            <div className="card">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Your Driver</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg">
                  🧑
                </div>
                <div>
                  <p className="font-semibold">{ride.driver.name}</p>
                  <p className="text-sm text-gray-500">{ride.driver.vehicle}</p>
                  <p className="text-sm text-yellow-500">
                    {"★".repeat(Math.floor(ride.driver.rating || 5))} {ride.driver.rating || 5}
                  </p>
                </div>
              </div>
              {ride.driver.phone && (
                <a
                  href={`tel:${ride.driver.phone}`}
                  className="mt-3 w-full flex items-center justify-center gap-2 btn-secondary text-sm py-2"
                >
                  📞 Call Driver
                </a>
              )}
            </div>
          )}

          {/* Cancel button */}
          {["requested", "accepted"].includes(ride.status) && user?.role === "passenger" && (
            <button onClick={handleCancel} className="w-full py-2 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
              Cancel Ride
            </button>
          )}

          {/* Rating — show after completion */}
          {ride.status === "completed" && !ride.rating && !rated && (
            <div className="card text-center">
              <p className="font-semibold mb-3">Rate your driver</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleRate(s)}
                    className={`text-3xl transition-transform hover:scale-125 ${s <= rating ? "text-yellow-400" : "text-gray-300"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          )}

          {rated && (
            <div className="card text-center text-green-600 font-medium py-4">
              ✅ Thanks for your {rating}-star rating!
            </div>
          )}

          {ride.status === "completed" && (
            <button onClick={() => navigate("/dashboard")} className="btn-primary w-full">
              Back to Dashboard
            </button>
          )}
          {ride.status === "cancelled" && (
            <button onClick={() => navigate("/book")} className="btn-primary w-full">
              Book Another Ride
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RideTracker;
