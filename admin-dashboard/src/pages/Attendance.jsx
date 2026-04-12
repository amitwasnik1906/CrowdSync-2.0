import { useEffect, useState } from "react";
import { Select } from "../components/ui/Input";
import Table from "../components/ui/Table";
import { listBuses, getBusAttendance } from "../api/buses";

export default function Attendance() {
  const [buses, setBuses] = useState([]);
  const [busId, setBusId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);

  useEffect(() => {
    listBuses().then((bs) => {
      setBuses(bs);
      if (bs.length && !busId) setBusId(bs[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!busId) return;
    getBusAttendance(busId, date).then(setRows).catch(() => setRows([]));
  }, [busId, date]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Attendance</h1>
        <p className="text-sm text-slate-500">View boarding and alighting records</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="w-64">
          <Select label="Bus" value={busId} onChange={(e) => setBusId(parseInt(e.target.value))}>
            {buses.map((b) => (
              <option key={b.id} value={b.id}>{b.busNumber} — {b.routeName}</option>
            ))}
          </Select>
        </div>
        <div className="w-48">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>
      </div>

      <Table
        columns={[
          { key: "student", label: "Student", render: (a) => a.student?.name || "—" },
          { key: "class", label: "Class", render: (a) => a.student?.class || "—" },
          { key: "entryTime", label: "Boarded", render: (a) => a.entryTime ? new Date(a.entryTime).toLocaleTimeString() : "—" },
          { key: "exitTime", label: "Exited", render: (a) => a.exitTime ? new Date(a.exitTime).toLocaleTimeString() : "—" },
          {
            key: "duration",
            label: "Duration",
            render: (a) => {
              if (!a.entryTime || !a.exitTime) return "—";
              const ms = new Date(a.exitTime) - new Date(a.entryTime);
              const mins = Math.round(ms / 60000);
              return `${mins} min`;
            },
          },
        ]}
        data={rows}
        empty="No attendance records for this day"
      />
    </div>
  );
}
