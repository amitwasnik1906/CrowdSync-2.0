import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MapPin } from "lucide-react";
import Button from "../components/ui/Button";
import Table from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import RouteMapPicker from "../components/RouteMapPicker";
import { listBuses, getBusRoute } from "../api/buses";
import { createRoute, updateRoute } from "../api/routes";

export default function RoutesPage() {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState({});
  const [editing, setEditing] = useState(null);
  const [polylineStr, setPolylineStr] = useState("");
  const [stopsStr, setStopsStr] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const reload = async () => {
    const busList = await listBuses();
    setBuses(busList);
    const r = {};
    await Promise.all(
      busList.map(async (b) => {
        try {
          r[b.id] = await getBusRoute(b.id);
        } catch {
          r[b.id] = null;
        }
      })
    );
    setRoutes(r);
  };

  useEffect(() => { reload().catch(() => {}); }, []);

  const openEditor = (bus) => {
    const existing = routes[bus.id];
    setPolylineStr(existing?.polyline || "");
    setStopsStr(existing?.stops ? JSON.stringify(existing.stops, null, 2) : "");
    setEditing(bus);
  };

  const closeEditor = () => {
    setEditing(null);
    setPolylineStr("");
    setStopsStr("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    let stops = null;
    if (stopsStr.trim()) {
      try {
        stops = JSON.parse(stopsStr);
      } catch {
        toast.error("Stops must be valid JSON");
        return;
      }
    }
    try {
      const existing = routes[editing.id];
      if (existing) {
        await updateRoute(editing.id, { polyline: polylineStr, stops });
        toast.success("Route updated");
      } else {
        await createRoute({ busId: editing.id, polyline: polylineStr, stops });
        toast.success("Route created");
      }
      closeEditor();
      reload();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    }
  };

  const handlePickerConfirm = (encodedPolyline, stops) => {
    setPolylineStr(encodedPolyline);
    setStopsStr(JSON.stringify(stops, null, 2));
    setPickerOpen(false);
    toast.success("Route drawn — review and save");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Routes</h1>
        <p className="text-sm text-slate-500">Set polylines and stops per bus</p>
      </div>

      <Table
        columns={[
          { key: "busNumber", label: "Bus" },
          { key: "routeName", label: "Route Name" },
          {
            key: "hasRoute",
            label: "Polyline",
            render: (b) => routes[b.id]
              ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Set</span>
              : <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Not set</span>,
          },
          {
            key: "actions",
            label: "Actions",
            render: (b) => (
              <Button variant="secondary" onClick={() => openEditor(b)}>
                {routes[b.id] ? "Edit" : "Create"}
              </Button>
            ),
          },
        ]}
        data={buses}
      />

      <Modal
        open={!!editing}
        onClose={closeEditor}
        title={`Route — ${editing?.busNumber}`}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block">
            <div className="mb-1 flex items-center justify-between">
              <span className="block text-sm font-medium text-slate-700">Polyline (encoded or WKT)</span>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                <MapPin size={14} /> Draw on map
              </button>
            </div>
            <textarea
              name="polyline"
              rows="4"
              required
              value={polylineStr}
              onChange={(e) => setPolylineStr(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="encodedPolylineString"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Stops (JSON array, optional)</span>
            <textarea
              name="stops"
              rows="4"
              value={stopsStr}
              onChange={(e) => setStopsStr(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder='[{"name":"Main St","lat":12.9,"lng":77.5}]'
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeEditor}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      <RouteMapPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={handlePickerConfirm}
      />
    </div>
  );
}
