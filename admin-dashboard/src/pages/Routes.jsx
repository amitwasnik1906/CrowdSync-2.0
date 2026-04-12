import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import { Select } from "../components/ui/Input";
import Table from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import { listBuses, getBusRoute } from "../api/buses";
import { createRoute, updateRoute } from "../api/routes";

export default function RoutesPage() {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState({});
  const [editing, setEditing] = useState(null);

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

  const handleSave = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const polyline = f.get("polyline");
    const stopsRaw = f.get("stops");
    let stops = null;
    if (stopsRaw?.trim()) {
      try {
        stops = JSON.parse(stopsRaw);
      } catch {
        toast.error("Stops must be valid JSON");
        return;
      }
    }
    try {
      const existing = routes[editing.id];
      if (existing) {
        await updateRoute(editing.id, { polyline, stops });
        toast.success("Route updated");
      } else {
        await createRoute({ busId: editing.id, polyline, stops });
        toast.success("Route created");
      }
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    }
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
              <Button variant="secondary" onClick={() => setEditing(b)}>
                {routes[b.id] ? "Edit" : "Create"}
              </Button>
            ),
          },
        ]}
        data={buses}
      />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Route — ${editing?.busNumber}`}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Polyline (encoded or WKT)</span>
            <textarea
              name="polyline"
              rows="4"
              required
              defaultValue={routes[editing?.id]?.polyline || ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="encodedPolylineString"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Stops (JSON array, optional)</span>
            <textarea
              name="stops"
              rows="4"
              defaultValue={routes[editing?.id]?.stops ? JSON.stringify(routes[editing.id].stops, null, 2) : ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder='[{"name":"Main St","lat":12.9,"lng":77.5}]'
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
