import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import Input, { Select } from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import Table from "../components/ui/Table";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { listStudents, createStudent, updateStudent, deleteStudent } from "../api/students";
import { listBuses } from "../api/buses";
import { listParents } from "../api/parents";

const MAX_FILES = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export default function Students() {
  const [students, setStudents] = useState([]);
  const [buses, setBuses] = useState([]);
  const [parents, setParents] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  const previews = useMemo(
    () => files.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [files]
  );

  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
  }, [previews]);

  const reload = () => {
    listStudents().then(setStudents).catch(() => {});
    listBuses().then(setBuses).catch(() => {});
    listParents().then(setParents).catch(() => {});
  };

  useEffect(() => { reload(); }, []);

  const openCreate = () => { setFiles([]); setEditing({}); };
  const openEdit = (s) => { setFiles([]); setEditing(s); };
  const closeModal = () => { setEditing(null); setFiles([]); };

  const acceptFiles = (incoming) => {
    const accepted = [];
    for (const f of incoming) {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name}: not an image`);
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`${f.name}: over 5 MB`);
        continue;
      }
      accepted.push(f);
    }
    setFiles((prev) => {
      const merged = [...prev, ...accepted];
      if (merged.length > MAX_FILES) {
        toast.error(`Max ${MAX_FILES} images — keeping the first ${MAX_FILES}`);
        return merged.slice(0, MAX_FILES);
      }
      return merged;
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) acceptFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);

    try {
      if (editing.id) {
        // Edit: JSON payload, faceId is read-only here (Drive folder ID).
        const data = {
          name: f.get("name"),
          class: f.get("class"),
          parentId: parseInt(f.get("parentId")),
          busId: parseInt(f.get("busId")),
        };
        await updateStudent(editing.id, data);
        toast.success("Student updated");
      } else {
        if (files.length === 0) {
          toast.error("Add at least one face image");
          return;
        }
        // Create: multipart so backend can stream images to Drive.
        const fd = new FormData();
        fd.append("name", f.get("name"));
        fd.append("class", f.get("class"));
        fd.append("parentId", f.get("parentId"));
        fd.append("busId", f.get("busId"));
        for (const file of files) fd.append("images", file);

        await createStudent(fd);
        toast.success("Student created");
      }
      closeModal();
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
        <Button onClick={openCreate}><Plus size={16} /> New Student</Button>
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
                <Button variant="ghost" onClick={() => openEdit(s)}><Pencil size={14} /></Button>
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
        onClose={closeModal}
        title={editing?.id ? "Edit Student" : "New Student"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Name" name="name" required defaultValue={editing?.name || ""} />
          <Input label="Class" name="class" required defaultValue={editing?.class || ""} />
          {editing?.id && (
            <Input
              label="Face ID (Drive folder)"
              name="faceId"
              value={editing?.faceId || ""}
              readOnly
              className="bg-slate-50 text-slate-500"
            />
          )}
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

          {!editing?.id && (
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Face images <span className="text-slate-400">({files.length}/{MAX_FILES})</span>
              </span>
              <label
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-sm transition ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Upload size={20} />
                <span>Drop images here, or click to choose</span>
                <span className="text-xs text-slate-400">JPEG/PNG, up to 5 MB each</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) acceptFiles(Array.from(e.target.files));
                    e.target.value = "";
                  }}
                />
              </label>

              {previews.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {previews.map((p, i) => (
                    <div key={p.url} className="relative">
                      <img
                        src={p.url}
                        alt={p.file.name}
                        className="h-20 w-full rounded-md border border-slate-200 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute -right-1 -top-1 rounded-full bg-white p-0.5 text-slate-600 shadow ring-1 ring-slate-200 hover:text-red-600"
                        aria-label="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
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
