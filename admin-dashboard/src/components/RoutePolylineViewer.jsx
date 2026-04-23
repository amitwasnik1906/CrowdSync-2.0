import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import polyline from "@mapbox/polyline";
import { X } from "lucide-react";
import Button from "./ui/Button";
import "../utils/leafletIcon";

function numberedIcon(index) {
  return L.divIcon({
    html: `<div style="background:#4f46e5;color:#fff;width:30px;height:30px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${index + 1}</div>`,
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function FitBounds({ positions }) {
  const map = useMap();
  if (positions.length) {
    map.fitBounds(positions, { padding: [30, 30] });
  }
  return null;
}

export default function RoutePolylineViewer({ open, onClose, title, encoded, stops }) {
  const positions = useMemo(() => {
    if (!encoded) return [];
    try {
      return polyline.decode(encoded);
    } catch {
      return [];
    }
  }, [encoded]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-lg font-semibold text-slate-800">{title || "Route preview"}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 p-4">
          {positions.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Could not decode polyline.
            </div>
          ) : (
            <div className="h-full overflow-hidden rounded-lg border border-slate-200">
              <MapContainer center={positions[0]} zoom={13} className="h-full w-full">
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                <Polyline positions={positions} color="#4f46e5" weight={4} />
                {stops?.map((s, i) => (
                  <Marker key={i} position={[s.lat, s.lng]} icon={numberedIcon(i)} />
                ))}
                <FitBounds positions={positions} />
              </MapContainer>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
