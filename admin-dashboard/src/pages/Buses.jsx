import { useEffect, useState } from "react";
import { Plus, Eye, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input, { Select } from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import Table from "../components/ui/Table";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { listBuses, createBus, assignDriver, deleteBus } from "../api/buses";
import { listDrivers } from "../api/drivers";

export default function Buses() {
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const navigate = useNavigate();

  const reload = () => {
    listBuses().then(setBuses).catch(() => {});
    listDrivers().then(setDrivers).catch(() => {});
  };

  useEffect(() => { reload(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await createBus({
        busNumber: f.get("busNumber"),
        routeName: f.get("routeName"),
        capacity: parseInt(f.get("capacity")),
      });
      toast.success("Bus created");
      setCreating(false);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    const driverId = parseInt(new FormData(e.target).get("driverId"));
    try {
      await assignDriver(assigning.id, driverId);
      toast.success("Driver assigned");
      setAssigning(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteBus(deleting.id);
      toast.success("Bus deleted");
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Buses</h1>
          <p className="text-sm text-slate-500">Manage fleet and assignments</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus size={16} /> New Bus</Button>
      </div>

      <Table
        columns={[
          { key: "busNumber", label: "Bus Number" },
          { key: "routeName", label: "Route" },
          { key: "capacity", label: "Capacity" },
          { key: "occupancy", label: "Occupancy", render: (b) => `${b.occupancy}/${b.capacity}` },
          { key: "driver", label: "Driver", render: (b) => b.driver?.name || "—" },
          {
            key: "actions",
            label: "Actions",
            render: (b) => (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/buses/${b.id}`); }}>
                  <Eye size={14} /> View
                </Button>
                <Button variant="secondary" onClick={(e) => { e.stopPropagation(); setAssigning(b); }}>
                  Assign Driver
                </Button>
                <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleting(b); }}>
                  <Trash2 size={14} className="text-red-600" />
                </Button>
              </div>
            ),
          },
        ]}
        data={buses}
        empty="No buses. Create one to get started."
      />

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create Bus"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Bus Number" name="busNumber" required placeholder="BUS-002" />
          <Input label="Route Name" name="routeName" required placeholder="Route B - Uptown" />
          <Input label="Capacity" name="capacity" type="number" required min="1" defaultValue="40" />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!assigning}
        onClose={() => setAssigning(null)}
        title={`Assign Driver to ${assigning?.busNumber}`}
      >
        <form onSubmit={handleAssign} className="space-y-4">
          <Select label="Driver" name="driverId" required defaultValue="">
            <option value="" disabled>Select a driver</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.phone})
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAssigning(null)}>Cancel</Button>
            <Button type="submit">Assign</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Bus"
        message={`Delete ${deleting?.busNumber}? Its route and attendance history will also be deleted. Reassign any students first.`}
      />
    </div>
  );
}
