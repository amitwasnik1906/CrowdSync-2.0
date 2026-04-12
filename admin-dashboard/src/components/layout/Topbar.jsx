import { LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="text-sm text-slate-500">Welcome back</div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium text-slate-800">{user?.name}</div>
          <div className="text-xs text-slate-500">{user?.email}</div>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
