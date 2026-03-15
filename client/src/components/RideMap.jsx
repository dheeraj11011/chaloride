import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useState, useCallback } from "react";

// ── Fix Leaflet default icon bug with Vite ──────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const makeIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

const orangeIcon = makeIcon("orange");
const blueIcon   = makeIcon("blue");
const greenIcon  = makeIcon("green");

// ── Nominatim geocoding helpers ───────────────────────────────────────────
const NOMINATIM = "https://nominatim.openstreetmap.org";

export const geocodeAddress = async (query) => {
  if (!query || query.length < 3) return [];
  const url = `${NOMINATIM}/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "en", "User-Agent": "ChaloRide/1.0" },
  });
  return res.json();
};

export const reverseGeocode = async (lat, lng) => {
  const url = `${NOMINATIM}/reverse?format=json&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "en", "User-Agent": "ChaloRide/1.0" },
  });
  const data = await res.json();
  return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};

// ── Fit map to bounds ─────────────────────────────────────────────────────
const FitBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions?.length >= 2) {
      map.fitBounds(positions, { padding: [50, 50] });
    } else if (positions?.length === 1) {
      map.setView(positions[0], 14);
    }
  }, [JSON.stringify(positions)]);
  return null;
};

// ── Click handler ─────────────────────────────────────────────────────────
const MapClickHandler = ({ mode, onPickup, onDestination, enabled }) => {
  useMapEvents({
    click: async (e) => {
      if (!enabled || mode === "view") return;
      const { lat, lng } = e.latlng;
      const address = await reverseGeocode(lat, lng);
      if (mode === "pickup") {
        onPickup?.({ lat, lng, address });
      } else if (mode === "destination") {
        onDestination?.({ lat, lng, address });
      }
    },
  });
  return null;
};

// ── Address search box ────────────────────────────────────────────────────
const AddressSearch = ({ placeholder, onSelect, icon, activeColor }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const search = useCallback(async (q) => {
    if (q.length < 3) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await geocodeAddress(q);
      setResults(data);
      setOpen(data.length > 0);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 450);
    return () => clearTimeout(t);
  }, [query]);

  const pick = (r) => {
    setQuery(r.display_name.split(",").slice(0, 2).join(","));
    setResults([]);
    setOpen(false);
    onSelect?.({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), address: r.display_name });
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 border border-gray-200 rounded-xl bg-white px-3 py-2.5 focus-within:ring-2 focus-within:ring-orange-400">
        <span className="text-base">{icon}</span>
        <input
          className="flex-1 outline-none text-sm bg-transparent placeholder-gray-400"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
        {loading && <span className="text-xs text-gray-400 animate-pulse">searching…</span>}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-[9999] top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
          {results.map((r) => (
            <li
              key={r.place_id}
              onMouseDown={() => pick(r)}
              className="px-4 py-2.5 text-sm hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0"
            >
              <span className={`font-semibold ${activeColor}`}>{r.display_name.split(",")[0]}</span>
              <span className="text-gray-400 text-xs ml-1 block truncate">
                {r.display_name.split(",").slice(1, 4).join(",")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────
const RideMap = ({
  pickup,
  destination,
  driverLocation,
  height = "400px",
  interactive = false,
  onPickupChange,
  onDestinationChange,
  showSearch = false,
}) => {
  const [clickMode, setClickMode] = useState("pickup");

  const center =
    pickup
      ? [pickup.lat, pickup.lng]
      : driverLocation
      ? [driverLocation.lat, driverLocation.lng]
      : [17.385, 78.4867]; // Hyderabad center default

  const positions = [
    pickup      && [pickup.lat, pickup.lng],
    destination && [destination.lat, destination.lng],
  ].filter(Boolean);

  return (
    <div className="flex flex-col" style={{ height }}>
      {/* Search boxes */}
      {showSearch && (
        <div className="p-3 space-y-2 bg-white border-b border-gray-100 z-10">
          <AddressSearch
            placeholder="Search pickup location…"
            icon="📍"
            activeColor="text-orange-500"
            onSelect={onPickupChange}
          />
          <AddressSearch
            placeholder="Search destination…"
            icon="🏁"
            activeColor="text-blue-500"
            onSelect={onDestinationChange}
          />
        </div>
      )}

      {/* Click mode selector */}
      {interactive && (
        <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100 z-10">
          <span className="text-xs text-gray-500 font-medium">Click map to set:</span>
          <button
            onClick={() => setClickMode("pickup")}
            className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${
              clickMode === "pickup"
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-orange-50"
            }`}
          >
            📍 Pickup
          </button>
          <button
            onClick={() => setClickMode("destination")}
            className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${
              clickMode === "destination"
                ? "bg-blue-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-blue-50"
            }`}
          >
            🏁 Destination
          </button>
          <span className="text-xs text-gray-300 ml-auto">tap map to pin</span>
        </div>
      )}

      {/* Map container */}
      <div className="flex-1" style={{ minHeight: 200 }}>
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler
            mode={clickMode}
            enabled={interactive}
            onPickup={onPickupChange}
            onDestination={onDestinationChange}
          />

          {pickup && (
            <Marker position={[pickup.lat, pickup.lng]} icon={orangeIcon}>
              <Popup>
                <strong>📍 Pickup</strong>
                <br />
                <span style={{ fontSize: "11px" }}>{pickup.address}</span>
              </Popup>
            </Marker>
          )}

          {destination && (
            <Marker position={[destination.lat, destination.lng]} icon={blueIcon}>
              <Popup>
                <strong>🏁 Destination</strong>
                <br />
                <span style={{ fontSize: "11px" }}>{destination.address}</span>
              </Popup>
            </Marker>
          )}

          {driverLocation && (
            <Marker position={[driverLocation.lat, driverLocation.lng]} icon={greenIcon}>
              <Popup>🚖 Your Driver</Popup>
            </Marker>
          )}

          {positions.length === 2 && (
            <Polyline
              positions={positions}
              color="#f97316"
              weight={4}
              dashArray="10,8"
              opacity={0.85}
            />
          )}

          {positions.length >= 1 && <FitBounds positions={positions} />}
        </MapContainer>
      </div>
    </div>
  );
};

export default RideMap;
