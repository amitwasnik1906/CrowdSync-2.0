import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Bus, User, GraduationCap, Users,
  Map, Navigation, ClipboardList,
} from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/buses", label: "Buses", icon: Bus },
  { to: "/drivers", label: "Drivers", icon: User },
  { to: "/students", label: "Students", icon: GraduationCap },
  { to: "/parents", label: "Parents", icon: Users },
  { to: "/routes", label: "Routes", icon: Map },
  { to: "/live-map", label: "Live Map", icon: Navigation },
  { to: "/attendance", label: "Attendance", icon: ClipboardList },
];

export default function Sidebar() {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600 text-white">
          <Bus size={18} />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-800">CrowdSync</div>
          <div className="text-xs text-slate-500">Admin</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
