import { useEffect, useState } from "react";
import { Bus, User, GraduationCap, Users } from "lucide-react";
import StatCard from "../components/ui/StatCard";
import Table from "../components/ui/Table";
import { listBuses } from "../api/buses";
import { listDrivers } from "../api/drivers";
import { listStudents } from "../api/students";

export default function Dashboard() {
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      listBuses().then(setBuses),
      listDrivers().then(setDrivers),
      listStudents().then(setStudents),
    ]).finally(() => setLoading(false));
  }, []);

  const totalStudents = students.length;
  const activeBuses = buses.filter((b) => b.currentLat && b.currentLng).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Overview</h1>
        <p className="text-sm text-slate-500">Real-time fleet and passenger stats</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Bus} label="Total Buses" value={buses.length} accent="indigo" />
        <StatCard icon={Bus} label="Active Buses" value={activeBuses} accent="emerald" />
        <StatCard icon={User} label="Drivers" value={drivers.length} accent="amber" />
        <StatCard icon={GraduationCap} label="Students" value={totalStudents} accent="rose" />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Fleet Status</h2>
        <Table
          columns={[
            { key: "busNumber", label: "Bus" },
            { key: "routeName", label: "Route" },
            {
              key: "occupancy",
              label: "Occupancy",
              render: (b) => {
                const pct = Math.round((b.occupancy / b.capacity) * 100) || 0;
                const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500";
                return (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-500">{b.occupancy}/{b.capacity}</span>
                  </div>
                );
              },
            },
            {
              key: "driver",
              label: "Driver",
              render: (b) => b.driver?.name || <span className="text-slate-400">Unassigned</span>,
            },
            {
              key: "status",
              label: "Status",
              render: (b) =>
                b.currentLat ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Live</span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Offline</span>
                ),
            },
          ]}
          data={buses}
          empty="No buses yet"
          isLoading={loading}
        />
      </div>
    </div>
  );
}
