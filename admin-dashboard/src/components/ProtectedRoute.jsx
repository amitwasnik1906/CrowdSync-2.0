import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="p-8 text-slate-500">Loading...</div>;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
