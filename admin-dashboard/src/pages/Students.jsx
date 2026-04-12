import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import Input, { Select } from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import Table from "../components/ui/Table";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { listStudents, createStudent, updateStudent, deleteStudent } from "../api/students";
import { listBuses } from "../api/buses";
import { listParents } from "../api/parents";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [buses, setBuses] = useState([]);
  const [parents, setParents] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const reload = () => {
    listStudents().then(setStudents).catch(() => {});
    listBuses().then(setBuses).catch(() => {});
    listParents().then(setParents).catch(() => {});
  };

  useEffect(() => { reload(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const data = {
      name: f.get("name"),
      class: f.get("class"),
      faceId: f.get("faceId"),
      parentId: parseInt(f.get("parentId")),
      busId: parseInt(f.get("busId")),
    };
    try {
      if (editing.id) {
        await updateStudent(editing.id, data);
        toast.success("Student updated");
      } else {
        await createStudent(data);
        toast.success("Student created");
      }
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteStudent(deleting.id);
      toast.success("Student deleted");
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
          <h1 className="text-2xl font-semibold text-slate-800">Students</h1>
          <p className="text-sm text-slate-500">Manage students on buses</p>
        </div>
        <Button onClick={() => setEditing({})}><Plus size={16} /> New Student</Button>
      </div>

      <Table
        columns={[
          { key: "name", label: "Name" },
          { key: "class", label: "Class" },
          { key: "faceId", label: "Face ID" },
          { key: "parent", label: "Parent", render: (s) => s.parent?.name || "—" },
          { key: "bus", label: "Bus", render: (s) => s.bus?.busNumber || "—" },
          {
            key: "actions",
            label: "Actions",
            render: (s) => (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditing(s)}><Pencil size={14} /></Button>
                <Button variant="ghost" onClick={() => setDeleting(s)}><Trash2 size={14} className="text-red-600" /></Button>
              </div>
            ),
          },
        ]}
        data={students}
        empty="No students yet"
      />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit Student" : "New Student"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Name" name="name" required defaultValue={editing?.name || ""} />
          <Input label="Class" name="class" required defaultValue={editing?.class || ""} />
          <Input label="Face ID" name="faceId" required defaultValue={editing?.faceId || ""} />
          <Select label="Parent" name="parentId" required defaultValue={editing?.parentId || ""}>
            <option value="" disabled>Select parent</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
            ))}
          </Select>
          <Select label="Bus" name="busId" required defaultValue={editing?.busId || ""}>
            <option value="" disabled>Select bus</option>
            {buses.map((b) => (
              <option key={b.id} value={b.id}>{b.busNumber} — {b.routeName}</option>
            ))}
          </Select>
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
        title="Delete Student"
        message={`Delete ${deleting?.name}?`}
      />
    </div>
  );
}
