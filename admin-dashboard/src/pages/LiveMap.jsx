import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import { Link } from "react-router-dom";
import L from "leaflet";
import polyline from "@mapbox/polyline";
import { listBuses, getBusRoute } from "../api/buses";
import { useAllBusesSocket } from "../hooks/useSocket";
import { busIcon } from "../utils/leafletIcon";

const DEFAULT_CENTER = [20.5937, 78.9629]; // India
const DEFAULT_ZOOM = 5;

const ROUTE_COLORS = [
  "#4f46e5", "#db2777", "#059669", "#ea580c", "#0891b2",
  "#7c3aed", "#dc2626", "#ca8a04", "#0d9488", "#2563eb",
];

const colorForIndex = (i) => ROUTE_COLORS[i % ROUTE_COLORS.length];

const numberedIcon = (index, color) =>
  L.divIcon({
    html: `<div style="background:${color};color:#fff;width:26px;height:26px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${index + 1}</div>`,
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

export default function LiveMap() {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState({}); // { [busId]: { positions, stops } }
  const [showRoutes, setShowRoutes] = useState(true);
  const [showStops, setShowStops] = useState(true);

  useEffect(() => {
    listBuses()
      .then(async (list) => {
        setBuses(list);
        const entries = await Promise.all(
          list.map(async (b) => {
            try {
              const r = await getBusRoute(b.id);
              if (!r?.polyline) return [b.id, null];
              const positions = polyline.decode(r.polyline);
              return [b.id, { positions, stops: r.stops || null }];
            } catch {
              return [b.id, null];
            }
          })
        );
        const map = {};
        for (const [id, data] of entries) if (data) map[id] = data;
        setRoutes(map);
      })
      .catch(() => {});
  }, []);

  const busIds = useMemo(() => buses.map((b) => b.id), [buses]);

  useAllBusesSocket(busIds, (update) => {
    setBuses((prev) =>
      prev.map((b) =>
        b.id === update.busId
          ? { ...b, currentLat: update.latitude, currentLng: update.longitude }
          : b
      )
    );
  });

  const active = buses.filter((b) => b.currentLat && b.currentLng);
  const center = active.length ? [active[0].currentLat, active[0].currentLng] : DEFAULT_CENTER;
  const zoom = active.length ? 13 : DEFAULT_ZOOM;

  const routedBuses = buses
    .map((b, i) => ({ bus: b, color: colorForIndex(i), route: routes[b.id] }))
    .filter((r) => r.route);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Live Map</h1>
          <p className="text-sm text-slate-500">
            {active.length} of {buses.length} buses live · {routedBuses.length} route{routedBuses.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showRoutes}
              onChange={(e) => setShowRoutes(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Show routes
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showStops}
              onChange={(e) => setShowStops(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Show stops
          </label>
        </div>
      </div>

      {showRoutes && routedBuses.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
          {routedBuses.map(({ bus, color }) => (
            <span key={bus.id} className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-700">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: color }} />
              <span className="font-semibold">{bus.busNumber}</span>
              <span className="text-slate-500">{bus.routeName}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <MapContainer center={center} zoom={zoom} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {showRoutes && routedBuses.map(({ bus, color, route }) => (
            <Polyline
              key={`route-${bus.id}`}
              positions={route.positions}
              pathOptions={{ color, weight: 4, opacity: 0.75 }}
            >
              <Popup>
                <div className="space-y-1">
                  <div className="font-semibold">{bus.busNumber}</div>
                  <div className="text-xs text-slate-600">{bus.routeName}</div>
                </div>
              </Popup>
            </Polyline>
          ))}

          {showStops && routedBuses.flatMap(({ bus, color, route }) =>
            (route.stops || []).map((s, i) => (
              <Marker
                key={`stop-${bus.id}-${i}`}
                position={[s.lat, s.lng]}
                icon={numberedIcon(i, color)}
              >
                <Popup>
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500">Stop {i + 1} · {bus.busNumber}</div>
                    <div className="font-semibold text-sm">{s.name || `${s.lat}, ${s.lng}`}</div>
                  </div>
                </Popup>
              </Marker>
            ))
          )}

          {active.map((b) => (
            <Marker key={b.id} position={[b.currentLat, b.currentLng]} icon={busIcon}>
              <Popup>
                <div className="space-y-1">
                  <div className="font-semibold">{b.busNumber}</div>
                  <div className="text-xs text-slate-600">{b.routeName}</div>
                  <div className="text-xs">Occupancy: {b.occupancy}/{b.capacity}</div>
                  <Link to={`/buses/${b.id}`} className="text-xs text-indigo-600 underline">
                    View details
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
