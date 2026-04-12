import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { ArrowLeft, LogIn, LogOut, Navigation } from "lucide-react";
import toast from "react-hot-toast";
import { getBus, getBusAttendance } from "../api/buses";
import { useBusSocket } from "../hooks/useSocket";
import { busIcon } from "../utils/leafletIcon";
import Table from "../components/ui/Table";

export default function BusDetail() {
  const { id } = useParams();
  const busId = parseInt(id);
  const [bus, setBus] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);

  const reload = () => {
    getBus(busId).then(setBus).catch(() => {});
    getBusAttendance(busId).then(setAttendance).catch(() => {});
  };
  useEffect(() => { reload(); }, [busId]);

  useBusSocket(busId, {
    onLocation: (d) =>
      setBus((prev) => prev ? { ...prev, currentLat: d.latitude, currentLng: d.longitude } : prev),
    onEntry: (d) => {
      toast.success(`${d.studentName} boarded`);
      setLiveEvents((prev) => [{ ...d, type: "entry" }, ...prev].slice(0, 20));
      reload();
    },
    onExit: (d) => {
      toast(`${d.studentName} exited`);
      setLiveEvents((prev) => [{ ...d, type: "exit" }, ...prev].slice(0, 20));
      reload();
    },
  });

  if (!bus) return <div className="text-slate-500">Loading...</div>;

  const pct = Math.round((bus.occupancy / bus.capacity) * 100) || 0;
  const pctColor = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="space-y-6">
      <Link to="/buses" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft size={16} /> Back to buses
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">{bus.busNumber}</h1>
          <p className="text-sm text-slate-500">{bus.routeName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Navigation size={16} /> Live Location
            </h3>
            <div className="h-80 overflow-hidden rounded-lg">
              {bus.currentLat && bus.currentLng ? (
                <MapContainer
                  center={[bus.currentLat, bus.currentLng]}
                  zoom={14}
                  scrollWheelZoom
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[bus.currentLat, bus.currentLng]} icon={busIcon}>
                    <Popup>{bus.busNumber}</Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div className="grid h-full place-items-center text-slate-400">
                  No GPS data yet
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Today's Attendance</h3>
            <Table
              columns={[
                { key: "student", label: "Student", render: (a) => a.student?.name || "—" },
                { key: "class", label: "Class", render: (a) => a.student?.class || "—" },
                { key: "entryTime", label: "Boarded", render: (a) => a.entryTime ? new Date(a.entryTime).toLocaleTimeString() : "—" },
                { key: "exitTime", label: "Exited", render: (a) => a.exitTime ? new Date(a.exitTime).toLocaleTimeString() : "—" },
              ]}
              data={attendance}
              empty="No boarding events yet"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Occupancy</h3>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-3xl font-semibold text-slate-800">{bus.occupancy}</span>
              <span className="text-sm text-slate-500">of {bus.capacity}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full transition-all ${pctColor}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 text-xs text-slate-500">{pct}% full</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Driver</h3>
            {bus.driver ? (
              <div>
                <div className="font-medium text-slate-800">{bus.driver.name}</div>
                <div className="text-sm text-slate-500">{bus.driver.phone}</div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">No driver assigned</div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Live Events</h3>
            {liveEvents.length === 0 ? (
              <div className="text-sm text-slate-400">Waiting for events...</div>
            ) : (
              <ul className="space-y-2">
                {liveEvents.map((e, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {e.type === "entry" ? (
                      <LogIn size={14} className="text-emerald-600" />
                    ) : (
                      <LogOut size={14} className="text-amber-600" />
                    )}
                    <span className="text-slate-700">{e.studentName}</span>
                    <span className="ml-auto text-xs text-slate-400">
                      {new Date(e.entryTime || e.exitTime).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
