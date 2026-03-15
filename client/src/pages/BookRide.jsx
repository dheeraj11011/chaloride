import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { rideAPI } from "../api/fetch";
import useStore from "../store/useStore";
import useSocket from "../hooks/useSocket";
import RideMap from "../components/RideMap";

const VEHICLE_TYPES = [
  { id: "auto",  label: "Auto",  icon: "🛺", desc: "Affordable" },
  { id: "mini",  label: "Mini",  icon: "🚗", desc: "Budget"     },
  { id: "sedan", label: "Sedan", icon: "🚙", desc: "Comfort"    },
  { id: "suv",   label: "SUV",   icon: "🚐", desc: "Premium"    },
];

const BookRide = () => {
  const navigate = useNavigate();
  const { setActiveRide, setNotification } = useStore();
  const { on } = useSocket();

  const [step, setStep] = useState(1); // 1=input, 2=estimate, 3=waiting
  const [vehicleType, setVehicleType] = useState("mini");
  const [pickup, setPickup] = useState(null);      // { lat, lng, address }
  const [destination, setDestination] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookedRide, setBookedRide] = useState(null);
  const [locating, setLocating] = useState(false);

  // Listen for ride accepted by driver
  useEffect(() => {
    const cleanup = on("ride_accepted", ({ rideId, driver }) => {
      setNotification(`Driver ${driver.name} accepted your ride! 🚖`, "success");
      navigate(`/ride/${rideId}`);
    });
    return cleanup;
  }, [on]);

  // Get current GPS location
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        try {
          const { reverseGeocode } = await import("../components/RideMap");
          const address = await reverseGeocode(lat, lng);
          setPickup({ lat, lng, address });
          setNotification("📍 Pickup set to your current location", "success");
        } catch (_) {
          setPickup({ lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
        }
        setLocating(false);
      },
      () => {
        setError("Unable to retrieve your location");
        setLocating(false);
      }
    );
  };

  const handleEstimate = async () => {
    if (!pickup?.lat || !destination?.lat) {
      setError("Please set both pickup and destination on the map");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await rideAPI.estimate({
        pickup:      { lat: pickup.lat, lng: pickup.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        vehicleType,
      });
      setEstimate(res.data.estimate);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to estimate fare");
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await rideAPI.book({
        pickup,
        destination,
        vehicleType,
      });
      const ride = res.data.ride;
      setBookedRide(ride);
      setActiveRide(ride);
      setStep(3);
      setNotification("Ride booked! Looking for nearby drivers...", "info");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to book ride");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!bookedRide) { setStep(1); return; }
    try {
      await rideAPI.cancel(bookedRide._id);
      setActiveRide(null);
      setBookedRide(null);
      setStep(1);
      setNotification("Ride cancelled", "info");
    } catch (_) {}
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Book a Ride</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ── Left: Form ── */}
        <div className="space-y-4">
          {step === 1 && (
            <>
              {/* Location picker card */}
              <div className="card space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700">📍 Set Locations</label>
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                    Search or click map
                  </span>
                </div>

                {/* Pickup display */}
                <div className={`flex items-start gap-2 p-3 rounded-xl border-2 transition-all ${
                  pickup ? "border-orange-200 bg-orange-50" : "border-dashed border-gray-200 bg-gray-50"
                }`}>
                  <span className="text-lg mt-0.5">📍</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-orange-500 mb-0.5">PICKUP</p>
                    {pickup ? (
                      <p className="text-sm text-gray-700 truncate">{pickup.address}</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Not set — search or click map</p>
                    )}
                  </div>
                  {pickup && (
                    <button onClick={() => setPickup(null)} className="text-gray-400 hover:text-red-400 text-lg leading-none">×</button>
                  )}
                </div>

                {/* Destination display */}
                <div className={`flex items-start gap-2 p-3 rounded-xl border-2 transition-all ${
                  destination ? "border-blue-200 bg-blue-50" : "border-dashed border-gray-200 bg-gray-50"
                }`}>
                  <span className="text-lg mt-0.5">🏁</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-blue-500 mb-0.5">DESTINATION</p>
                    {destination ? (
                      <p className="text-sm text-gray-700 truncate">{destination.address}</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Not set — search or click map</p>
                    )}
                  </div>
                  {destination && (
                    <button onClick={() => setDestination(null)} className="text-gray-400 hover:text-red-400 text-lg leading-none">×</button>
                  )}
                </div>

                {/* GPS button */}
                <button
                  onClick={useCurrentLocation}
                  disabled={locating}
                  className="w-full flex items-center justify-center gap-2 text-sm text-orange-500 hover:text-orange-600 font-medium border border-orange-200 rounded-xl py-2 hover:bg-orange-50 transition-colors disabled:opacity-50"
                >
                  {locating ? (
                    <><span className="animate-spin">⏳</span> Locating…</>
                  ) : (
                    <><span>📌</span> Use my current location as pickup</>
                  )}
                </button>
              </div>

              {/* Vehicle type */}
              <div className="card">
                <label className="block text-sm font-semibold text-gray-700 mb-3">🚗 Vehicle Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {VEHICLE_TYPES.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setVehicleType(v.id)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        vehicleType === v.id
                          ? "border-orange-500 bg-orange-50 shadow-sm"
                          : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <div className="text-2xl">{v.icon}</div>
                      <div className="text-xs font-semibold mt-1">{v.label}</div>
                      <div className="text-xs text-gray-400">{v.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <button
                onClick={handleEstimate}
                disabled={loading || !pickup || !destination}
                className="btn-primary w-full"
              >
                {loading ? "Estimating…" : "Get Fare Estimate →"}
              </button>
            </>
          )}

          {step === 2 && estimate && (
            <div className="card space-y-4">
              <h2 className="text-lg font-bold">Fare Estimate</h2>

              <div className="bg-orange-50 rounded-xl p-4 text-center">
                <p className="text-4xl font-bold text-orange-500">₹{estimate.estimatedFare}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {estimate.distanceKm} km · ~{estimate.estimatedMinutes} min
                </p>
                {estimate.surge > 1 && (
                  <span className="inline-block mt-2 bg-yellow-100 text-yellow-700 text-xs px-3 py-1 rounded-full font-medium">
                    ⚡ {estimate.surge}x surge pricing
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Base fare</span>
                  <span>₹{estimate.breakdown.baseFare}</span>
                </div>
                <div className="flex justify-between">
                  <span>Distance ({estimate.distanceKm} km)</span>
                  <span>₹{estimate.breakdown.distanceFare}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time ({estimate.estimatedMinutes} min)</span>
                  <span>₹{estimate.breakdown.timeFare}</span>
                </div>
                {estimate.surge > 1 && (
                  <div className="flex justify-between text-yellow-600">
                    <span>Surge multiplier</span>
                    <span>×{estimate.surge}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 space-y-1 text-sm border-t border-gray-100">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Route</p>
                <p className="text-gray-600 truncate">📍 {pickup?.address}</p>
                <p className="text-gray-600 truncate">🏁 {destination?.address}</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary">← Change</button>
                <button onClick={handleBook} disabled={loading} className="btn-primary">
                  {loading ? "Booking…" : "Confirm Booking"}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="card text-center py-8 space-y-4">
              <div className="text-5xl animate-bounce">🚖</div>
              <h2 className="text-xl font-bold">Looking for drivers…</h2>
              <p className="text-gray-500 text-sm">
                We're finding the nearest driver for you. Hang tight!
              </p>
              <div className="flex justify-center gap-1 mt-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
              <button onClick={handleCancel} className="btn-secondary text-sm mt-4">
                Cancel Ride
              </button>
            </div>
          )}
        </div>

        {/* ── Right: Interactive Map ── */}
        <div className="card p-0 overflow-hidden" style={{ minHeight: 500 }}>
          <RideMap
            pickup={pickup}
            destination={destination}
            height="100%"
            interactive={step === 1}
            showSearch={step === 1}
            onPickupChange={setPickup}
            onDestinationChange={setDestination}
          />
        </div>
      </div>
    </div>
  );
};

export default BookRide;
