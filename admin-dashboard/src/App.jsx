import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Buses from "./pages/Buses";
import BusDetail from "./pages/BusDetail";
import Drivers from "./pages/Drivers";
import Students from "./pages/Students";
import Parents from "./pages/Parents";
import RoutesPage from "./pages/Routes";
import LiveMap from "./pages/LiveMap";
import Attendance from "./pages/Attendance";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="buses" element={<Buses />} />
          <Route path="buses/:id" element={<BusDetail />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="students" element={<Students />} />
          <Route path="parents" element={<Parents />} />
          <Route path="routes" element={<RoutesPage />} />
          <Route path="live-map" element={<LiveMap />} />
          <Route path="attendance" element={<Attendance />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
