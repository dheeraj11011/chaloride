import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { rideAPI } from "../api/fetch";
import useStore from "../store/useStore";

const STATUS_COLORS = {
  requested:   "bg-yellow-100 text-yellow-700",
  accepted:    "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed:   "bg-green-100 text-green-700",
  cancelled:   "bg-red-100 text-red-700",
};

const Dashboard = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const [activeRide, setActiveRide] = useState(null);
  const [recentRides, setRecentRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [activeRes, historyRes] = await Promise.all([
          rideAPI.getActive(),
          rideAPI.getHistory(),
        ]);
        setActiveRide(activeRes.data.ride);
        setRecentRides(historyRes.data.rides?.slice(0, 5) || []);
      } catch (_) {}
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hello, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-500 mt-0.5">Where are you headed today?</p>
        </div>
        <Link to="/book" className="btn-primary flex items-center gap-2">
          <span>🚖</span> Book a Ride
        </Link>
      </div>

      {/* Active Ride Banner */}
      {activeRide && (
        <div
          onClick={() => navigate(`/ride/${activeRide._id}`)}
          className="card border-2 border-orange-300 bg-orange-50 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-orange-500 font-bold">Active Ride</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[activeRide.status]}`}>
                  {activeRide.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-sm text-gray-600">📍 {activeRide.pickup?.address}</p>
              <p className="text-sm text-gray-600">🏁 {activeRide.destination?.address}</p>
              {activeRide.driver && (
                <p className="text-sm text-blue-600 mt-1 font-medium">
                  Driver: {activeRide.driver.name} · {activeRide.driver.vehicle}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-500">₹{activeRide.fare}</p>
              <p className="text-xs text-gray-500">{activeRide.distanceKm} km</p>
              <p className="text-orange-500 text-sm mt-2 font-medium">Track →</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-orange-500">{user?.totalRides || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Total Rides</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-500">
            {recentRides.filter((r) => r.status === "completed").length}
          </p>
          <p className="text-sm text-gray-500 mt-1">Completed</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-500">
            ₹{recentRides.filter((r) => r.status === "completed").reduce((a, r) => a + r.fare, 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Total Spent</p>
        </div>
      </div>

      {/* Quick Book */}
      {!activeRide && (
        <div className="card bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-1">Need a ride?</h3>
            <p className="text-orange-100 text-sm">Get an instant fare estimate</p>
          </div>
          <Link to="/book" className="bg-white text-orange-500 font-bold px-6 py-3 rounded-xl hover:bg-orange-50 transition-colors">
            Ride Now →
          </Link>
        </div>
      )}

      {/* Recent Rides */}
      {recentRides.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Recent Rides</h2>
            <Link to="/history" className="text-orange-500 text-sm font-medium hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {recentRides.map((ride) => (
              <div
                key={ride._id}
                onClick={() => navigate(`/ride/${ride._id}`)}
                className="card flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ride.status]}`}>
                      {ride.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(ride.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{ride.pickup?.address} → {ride.destination?.address}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{ride.distanceKm} km · {ride.vehicleType}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">₹{ride.fare}</p>
                  {ride.rating && <p className="text-yellow-500 text-sm">{"★".repeat(ride.rating)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentRides.length === 0 && !activeRide && (
        <div className="card text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🚗</div>
          <p className="font-medium">No rides yet</p>
          <p className="text-sm mt-1">Book your first ride above!</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
