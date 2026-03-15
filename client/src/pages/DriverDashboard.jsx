import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { driverAPI } from "../api/fetch";
import useStore from "../store/useStore";
import useSocket from "../hooks/useSocket";
import RideMap from "../components/RideMap";

const DriverDashboard = () => {
  const { user, updateUser, setNotification } = useStore();
  const navigate = useNavigate();
  const { on, emit } = useSocket();

  const [isAvailable, setIsAvailable] = useState(user?.isAvailable || false);
  const [stats, setStats] = useState(null);
  const [nearbyRides, setNearbyRides] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [togglingAvail, setTogglingAvail] = useState(false);
  const [locationWatcher, setLocationWatcher] = useState(null);

  // Load initial data
  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, ridesRes] = await Promise.all([
          driverAPI.getStats(),
          driverAPI.getNearbyRides(),
        ]);
        setStats(statsRes.data.stats);
        setIsAvailable(statsRes.data.stats.isAvailable);
        setNearbyRides(ridesRes.data.rides || []);
      } catch (_) {}
      setLoading(false);
    };
    load();
  }, []);

  // Socket: new ride request from passenger
  useEffect(() => {
    const cleanup = on("new_ride_request", (ride) => {
      setNearbyRides((prev) => [ride, ...prev.filter((r) => r.rideId !== ride.rideId)]);
      setNotification("New ride request nearby!", "info");
    });
    return cleanup;
  }, [on]);

  // Socket: ride was taken by another driver
  useEffect(() => {
    const cleanup = on("ride_taken", ({ rideId }) => {
      setNearbyRides((prev) => prev.filter((r) => r.rideId !== rideId && r._id !== rideId));
    });
    return cleanup;
  }, [on]);

  // GPS: continuously broadcast location while online
  const startLocationBroadcast = useCallback(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        emit("driver:update_location", {
          lat: coords.latitude,
          lng: coords.longitude,
        });
      },
      (err) => console.warn("GPS error:", err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    setLocationWatcher(id);
  }, [emit]);

  const stopLocationBroadcast = useCallback(() => {
    if (locationWatcher) {
      navigator.geolocation.clearWatch(locationWatcher);
      setLocationWatcher(null);
    }
  }, [locationWatcher]);

  const handleToggleAvailability = async () => {
    setTogglingAvail(true);
    try {
      const res = await driverAPI.toggleAvailability();
      const newAvail = res.data.isAvailable;
      setIsAvailable(newAvail);
      updateUser({ isAvailable: newAvail });
      setNotification(res.data.message, "success");

      if (newAvail) startLocationBroadcast();
      else stopLocationBroadcast();
    } catch (_) {
      setNotification("Failed to update availability", "error");
    }
    setTogglingAvail(false);
  };

  const handleAcceptRide = async (rideId) => {
    try {
      const res = await driverAPI.acceptRide(rideId);
      setActiveRide(res.data.ride);
      setNearbyRides([]);
      setNotification("Ride accepted! Head to pickup location.", "success");
    } catch (err) {
      setNotification(err.response?.data?.message || "Failed to accept ride", "error");
    }
  };

  const handleStartRide = async () => {
    try {
      await driverAPI.startRide(activeRide._id);
      setActiveRide((r) => ({ ...r, status: "in_progress" }));
      setNotification("Ride started! Drive safely 🚖", "success");
    } catch (_) {}
  };

  const handleCompleteRide = async () => {
    try {
      const res = await driverAPI.completeRide(activeRide._id);
      setNotification(`Ride completed! You earned ₹${activeRide.fare} 🎉`, "success");
      setActiveRide(null);
      setIsAvailable(true);
      // Refresh stats
      const statsRes = await driverAPI.getStats();
      setStats(statsRes.data.stats);
    } catch (_) {}
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh] text-gray-400">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Driver Panel 🚖</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isAvailable ? "You are online — receiving requests" : "You are offline"}
          </p>
        </div>

        {/* Online / Offline Toggle */}
        <button
          onClick={handleToggleAvailability}
          disabled={togglingAvail || !!activeRide}
          className={`relative px-6 py-3 rounded-2xl font-bold text-white transition-all text-sm ${
            isAvailable
              ? "bg-green-500 hover:bg-green-600"
              : "bg-gray-400 hover:bg-gray-500"
          } disabled:opacity-50`}
        >
          {togglingAvail ? "..." : isAvailable ? "🟢 Online" : "⚫ Go Online"}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <p className="text-2xl font-bold text-green-500">₹{stats.todayEarnings}</p>
            <p className="text-xs text-gray-500 mt-1">Today's Earnings</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.todayRides}</p>
            <p className="text-xs text-gray-500 mt-1">Today's Rides</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-orange-500">₹{stats.totalEarnings}</p>
            <p className="text-xs text-gray-500 mt-1">Total Earnings</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-yellow-500">⭐ {stats.rating}</p>
            <p className="text-xs text-gray-500 mt-1">Rating</p>
          </div>
        </div>
      )}

      {/* Active Ride */}
      {activeRide && (
        <div className="space-y-4">
          {/* Active ride map */}
          <div className="card p-0 overflow-hidden" style={{ height: 280 }}>
            <RideMap
              pickup={activeRide.pickup}
              destination={activeRide.destination}
              height="100%"
            />
          </div>

          <div className="card border-2 border-blue-300 bg-blue-50 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
            <h2 className="font-bold text-blue-700">Active Ride</h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{activeRide.status?.replace("_", " ")}</span>
          </div>

          <div className="space-y-1 text-sm">
            <p><span className="text-gray-400">Passenger:</span> <span className="font-medium">{activeRide.passenger?.name}</span></p>
            <p><span className="text-gray-400">Phone:</span> <a href={`tel:${activeRide.passenger?.phone}`} className="text-blue-600">{activeRide.passenger?.phone}</a></p>
            <p><span className="text-gray-400">Pickup:</span> {activeRide.pickup?.address}</p>
            <p><span className="text-gray-400">Destination:</span> {activeRide.destination?.address}</p>
            <p><span className="text-gray-400">Distance:</span> {activeRide.distanceKm} km</p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-green-600">₹{activeRide.fare}</p>
            <div className="flex gap-2">
              {activeRide.status === "accepted" && (
                <button onClick={handleStartRide} className="btn-primary text-sm py-2">
                  Start Ride 🚦
                </button>
              )}
              {activeRide.status === "in_progress" && (
                <button onClick={handleCompleteRide} className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl text-sm transition-all">
                  Complete Ride ✅
                </button>
              )}
            </div>
          </div>
          </div>
        </div>
      )}
        <div>
          <h2 className="text-lg font-bold mb-3">
            Available Rides
            {nearbyRides.length > 0 && (
              <span className="ml-2 bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full">{nearbyRides.length}</span>
            )}
          </h2>

          {nearbyRides.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              <div className="text-4xl mb-3 animate-pulse">📡</div>
              <p>Waiting for ride requests...</p>
              <p className="text-sm mt-1">Stay online to receive requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nearbyRides.map((ride) => (
                <div key={ride.rideId || ride._id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">{ride.vehicleType}</span>
                        <span className="text-xs text-gray-400">{ride.distanceKm} km</span>
                      </div>
                      <p className="text-sm"><span className="text-gray-400">📍</span> {ride.pickup?.address}</p>
                      <p className="text-sm"><span className="text-gray-400">🏁</span> {ride.destination?.address}</p>
                      {ride.passenger && (
                        <p className="text-xs text-gray-400">Passenger: {ride.passenger.name}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xl font-bold text-green-600">₹{ride.fare}</p>
                      <button
                        onClick={() => handleAcceptRide(ride.rideId || ride._id)}
                        className="mt-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Offline state */}
      {!activeRide && !isAvailable && (
        <div className="card text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">😴</div>
          <p className="font-semibold text-gray-600">You're offline</p>
          <p className="text-sm mt-1">Go online to start receiving ride requests and earn money</p>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
