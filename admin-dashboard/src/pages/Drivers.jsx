import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import Table from "../components/ui/Table";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { listDrivers, createDriver, updateDriver, deleteDriver } from "../api/drivers";

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [editing, setEditing] = useState(null); // null | {} | driver
  const [deleting, setDeleting] = useState(null);

  const reload = () => listDrivers().then(setDrivers).catch(() => {});
  useEffect(() => { reload(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const data = {
      name: f.get("name"),
      phone: f.get("phone"),
      licenseNumber: f.get("licenseNumber"),
      faceId: f.get("faceId"),
    };
    try {
      if (editing.id) {
        await updateDriver(editing.id, data);
        toast.success("Driver updated");
      } else {
        await createDriver(data);
        toast.success("Driver created");
      }
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDriver(deleting.id);
      toast.success("Driver deleted");
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
          <h1 className="text-2xl font-semibold text-slate-800">Drivers</h1>
          <p className="text-sm text-slate-500">Manage drivers and their assignments</p>
        </div>
        <Button onClick={() => setEditing({})}><Plus size={16} /> New Driver</Button>
      </div>

      <Table
        columns={[
          { key: "name", label: "Name" },
          { key: "phone", label: "Phone" },
          { key: "licenseNumber", label: "License" },
          { key: "bus", label: "Assigned Bus", render: (d) => d.bus?.busNumber || "—" },
          {
            key: "actions",
            label: "Actions",
            render: (d) => (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditing(d)}><Pencil size={14} /></Button>
                <Button variant="ghost" onClick={() => setDeleting(d)}><Trash2 size={14} className="text-red-600" /></Button>
              </div>
            ),
          },
        ]}
        data={drivers}
      />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit Driver" : "New Driver"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Name" name="name" required defaultValue={editing?.name || ""} />
          <Input label="Phone" name="phone" required defaultValue={editing?.phone || ""} />
          <Input label="License Number" name="licenseNumber" required defaultValue={editing?.licenseNumber || ""} />
          <Input label="Face ID" name="faceId" required defaultValue={editing?.faceId || ""} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Driver"
        message={`Delete ${deleting?.name}? This cannot be undone.`}
      />
    </div>
  );
}
