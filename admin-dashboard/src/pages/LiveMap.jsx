import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Link } from "react-router-dom";
import { listBuses } from "../api/buses";
import { useAllBusesSocket } from "../hooks/useSocket";
import { busIcon } from "../utils/leafletIcon";

const DEFAULT_CENTER = [20.5937, 78.9629]; // India
const DEFAULT_ZOOM = 5;

export default function LiveMap() {
  const [buses, setBuses] = useState([]);

  useEffect(() => {
    listBuses().then(setBuses).catch(() => {});
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

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Live Map</h1>
          <p className="text-sm text-slate-500">
            {active.length} of {buses.length} buses live
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <MapContainer center={center} zoom={zoom} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
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
