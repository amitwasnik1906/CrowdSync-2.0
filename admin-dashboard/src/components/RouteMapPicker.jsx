import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";
import polyline from "@mapbox/polyline";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import Button from "./ui/Button";
import "../utils/leafletIcon";

const ORS_API_KEY = import.meta.env.VITE_APP_ORSM_API_KEY;
const SUGGEST_DEBOUNCE_MS = 400;

function numberedIcon(index) {
  return L.divIcon({
    html: `<div style="background:#4f46e5;color:#fff;width:30px;height:30px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${index + 1}</div>`,
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function MapClickHandler({ onAdd }) {
  useMapEvents({
    click(e) {
      onAdd(e.latlng);
    },
  });
  return null;
}

function SuggestionDropdown({ anchorEl, items, onSelect }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!anchorEl) return;
    const update = () => setRect(anchorEl.getBoundingClientRect());
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorEl]);

  if (!rect || !items?.length) return null;

  return createPortal(
    <ul
      style={{
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      }}
      className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
    >
      {items.map((place, i) => (
        <li
          key={i}
          onClick={() => onSelect(place)}
          className="cursor-pointer border-b border-slate-100 px-3 py-2 text-xs text-slate-700 last:border-0 hover:bg-indigo-50"
        >
          {place.properties.label}
        </li>
      ))}
    </ul>,
    document.body
  );
}

export default function RouteMapPicker({ open, onClose, onConfirm }) {
  const [locations, setLocations] = useState([{ name: "", coords: null }]);
  const [suggestions, setSuggestions] = useState({});
  const [route, setRoute] = useState([]);
  const [encoded, setEncoded] = useState(null);
  const [loading, setLoading] = useState(false);
  const [clickMode, setClickMode] = useState(false);

  const debounceTimers = useRef({});
  const requestIds = useRef({});
  const inputRefs = useRef({});

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  if (!open) return null;

  const fetchSuggestions = (query, index) => {
    clearTimeout(debounceTimers.current[index]);

    if (query.length < 3) {
      setSuggestions((prev) => ({ ...prev, [index]: [] }));
      return;
    }

    debounceTimers.current[index] = setTimeout(async () => {
      const rid = (requestIds.current[index] || 0) + 1;
      requestIds.current[index] = rid;
      try {
        const response = await axios.get(
          "https://api.openrouteservice.org/geocode/autocomplete",
          { params: { api_key: ORS_API_KEY, text: query } }
        );
        if (requestIds.current[index] !== rid) return; // stale response
        setSuggestions((prev) => ({ ...prev, [index]: response.data.features }));
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      }
    }, SUGGEST_DEBOUNCE_MS);
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await axios.get(
        "https://api.openrouteservice.org/geocode/reverse",
        { params: { api_key: ORS_API_KEY, "point.lat": lat, "point.lon": lng, size: 1 } }
      );
      return response.data.features?.[0]?.properties?.label || null;
    } catch {
      return null;
    }
  };

  const addPinFromMap = async ({ lat, lng }) => {
    const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    setLocations((prev) => {
      const hasEmpty = prev.length > 0 && !prev[prev.length - 1].coords && !prev[prev.length - 1].name;
      const pin = { name: fallback, coords: [lng, lat] };
      return hasEmpty ? [...prev.slice(0, -1), pin] : [...prev, pin];
    });
    const label = await reverseGeocode(lat, lng);
    if (!label) return;
    setLocations((prev) =>
      prev.map((loc) =>
        loc.coords && loc.coords[0] === lng && loc.coords[1] === lat && loc.name === fallback
          ? { ...loc, name: label }
          : loc
      )
    );
  };

  const fetchRoute = async () => {
    const validCoords = locations.filter((loc) => loc.coords).map((loc) => loc.coords);

    if (validCoords.length < 2) {
      toast.error("Please select at least two locations.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        "https://api.openrouteservice.org/v2/directions/driving-car",
        { coordinates: validCoords, instructions: false },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: ORS_API_KEY,
          },
        }
      );
      const encodedPolyline = response.data.routes[0].geometry;
      const decoded = polyline.decode(encodedPolyline);
      setRoute(decoded.map(([lat, lng]) => ({ lat, lng })));
      setEncoded(encodedPolyline);
    } catch (err) {
      console.error("Error fetching route:", err);
      toast.error("Failed to compute route. Check your API key.");
    } finally {
      setLoading(false);
    }
  };

  const addLocation = () => {
    setLocations([...locations, { name: "", coords: null }]);
  };

  const removeLocation = (index) => {
    setLocations(locations.filter((_, i) => i !== index));
    setSuggestions((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    clearTimeout(debounceTimers.current[index]);
    delete debounceTimers.current[index];
    delete inputRefs.current[index];
  };

  const handleConfirm = () => {
    if (!encoded) {
      toast.error("Generate a route before saving.");
      return;
    }
    const stops = locations
      .filter((loc) => loc.coords)
      .map((loc) => ({
        name: loc.name,
        lat: loc.coords[1],
        lng: loc.coords[0],
      }));
    onConfirm(encoded, stops);
    reset();
  };

  const reset = () => {
    setLocations([{ name: "", coords: null }]);
    setSuggestions({});
    setRoute([]);
    setEncoded(null);
    setClickMode(false);
    Object.values(debounceTimers.current).forEach(clearTimeout);
    debounceTimers.current = {};
    requestIds.current = {};
    inputRefs.current = {};
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pinnedLocations = locations.filter((loc) => loc.coords);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-lg font-semibold text-slate-800">Draw route on map</h3>
          <button onClick={handleClose} className="rounded p-1 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-4">
          {/* Left panel */}
          <div className="flex flex-col gap-4 lg:col-span-1">
            <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: "45vh" }}>
              {locations.map((location, index) => (
                <div key={index}>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      ref={(el) => {
                        if (el) inputRefs.current[index] = el;
                        else delete inputRefs.current[index];
                      }}
                      placeholder={`Location ${index + 1}`}
                      value={location.name}
                      onChange={(e) => {
                        const next = [...locations];
                        next[index] = { ...next[index], name: e.target.value, coords: null };
                        setLocations(next);
                        fetchSuggestions(e.target.value, index);
                      }}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    {locations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLocation(index)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                        aria-label="Remove stop"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  <SuggestionDropdown
                    anchorEl={inputRefs.current[index]}
                    items={suggestions[index]}
                    onSelect={(place) => {
                      const next = [...locations];
                      next[index] = {
                        name: place.properties.label,
                        coords: place.geometry.coordinates,
                      };
                      setLocations(next);
                      setSuggestions((prev) => ({ ...prev, [index]: [] }));
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={addLocation}>
                Add stop
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={fetchRoute}
                disabled={loading || pinnedLocations.length < 2}
              >
                {loading ? "Routing..." : "Get route"}
              </Button>
            </div>

            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={clickMode}
                onChange={(e) => setClickMode(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Click on map to add stop
            </label>

            <div className="mt-auto flex justify-end gap-2 border-t border-slate-200 pt-3">
              <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
              <Button type="button" onClick={handleConfirm} disabled={!encoded}>
                Use this route
              </Button>
            </div>
          </div>

          {/* Map */}
          <div
            className={`min-h-[400px] overflow-hidden rounded-lg border border-slate-200 lg:col-span-3 ${
              clickMode ? "cursor-crosshair" : ""
            }`}
          >
            <MapContainer center={[20.5937, 78.9629]} zoom={5} className="h-full w-full">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              {clickMode && <MapClickHandler onAdd={addPinFromMap} />}
              {pinnedLocations.map((loc, i) => (
                <Marker
                  key={i}
                  position={[loc.coords[1], loc.coords[0]]}
                  icon={numberedIcon(i)}
                />
              ))}
              {route.length > 0 && (
                <Polyline positions={route.map(({ lat, lng }) => [lat, lng])} color="#4f46e5" />
              )}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
