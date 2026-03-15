import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { rideAPI } from "../api/fetch";

const STATUS_COLORS = {
  requested:   "bg-yellow-100 text-yellow-700",
  accepted:    "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed:   "bg-green-100 text-green-700",
  cancelled:   "bg-red-100 text-red-700",
};

const History = () => {
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rideAPI.getHistory()
      .then((res) => setRides(res.data.rides || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-gray-400">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Ride History</h1>

      {rides.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📋</div>
          <p>No rides found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rides.map((ride) => (
            <div
              key={ride._id}
              onClick={() => navigate(`/ride/${ride._id}`)}
              className="card hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ride.status]}`}>
                      {ride.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(ride.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{ride.vehicleType}</span>
                  </div>
                  <p className="text-sm font-medium">
                    {ride.pickup?.address} → {ride.destination?.address}
                  </p>
                  <p className="text-xs text-gray-400">{ride.distanceKm} km</p>
                  {ride.driver && <p className="text-xs text-blue-500">Driver: {ride.driver.name}</p>}
                </div>
                <div className="text-right ml-4">
                  <p className="text-lg font-bold text-gray-900">₹{ride.fare}</p>
                  {ride.rating && (
                    <p className="text-yellow-500 text-sm">{"★".repeat(ride.rating)}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
