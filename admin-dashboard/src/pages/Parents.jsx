import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import Table from "../components/ui/Table";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { listParents, createParent, updateParent, deleteParent } from "../api/parents";

export default function Parents() {
  const [parents, setParents] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const reload = () => listParents().then(setParents).catch(() => {});
  useEffect(() => { reload(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const data = {
      name: f.get("name"),
      phone: f.get("phone"),
      email: f.get("email") || undefined,
    };
    try {
      if (editing.id) {
        await updateParent(editing.id, data);
        toast.success("Parent updated");
      } else {
        await createParent(data);
        toast.success("Parent created");
      }
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteParent(deleting.id);
      toast.success("Parent deleted");
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
          <h1 className="text-2xl font-semibold text-slate-800">Parents</h1>
          <p className="text-sm text-slate-500">Manage parent accounts</p>
        </div>
        <Button onClick={() => setEditing({})}><Plus size={16} /> New Parent</Button>
      </div>

      <Table
        columns={[
          { key: "name", label: "Name" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email", render: (p) => p.email || "—" },
          { key: "students", label: "Students", render: (p) => p._count?.students ?? 0 },
          {
            key: "actions",
            label: "Actions",
            render: (p) => (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditing(p)}><Pencil size={14} /></Button>
                <Button variant="ghost" onClick={() => setDeleting(p)}><Trash2 size={14} className="text-red-600" /></Button>
              </div>
            ),
          },
        ]}
        data={parents}
        empty="No parents yet"
      />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit Parent" : "New Parent"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Name" name="name" required defaultValue={editing?.name || ""} />
          <Input label="Phone" name="phone" required defaultValue={editing?.phone || ""} />
          <Input label="Email" name="email" type="email" defaultValue={editing?.email || ""} />
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
        title="Delete Parent"
        message={`Delete ${deleting?.name}? Their students will also be deleted.`}
      />
    </div>
  );
}
