import { createContext, useContext, useEffect, useState } from "react";
import { adminLogin } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("crowdsync_admin_token");
    const u = localStorage.getItem("crowdsync_admin_user");
    if (t && u) {
      setToken(t);
      setUser(JSON.parse(u));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { token: newToken, admin } = await adminLogin(email, password);
    localStorage.setItem("crowdsync_admin_token", newToken);
    localStorage.setItem("crowdsync_admin_user", JSON.stringify(admin));
    setToken(newToken);
    setUser(admin);
    return admin;
  };

  const logout = () => {
    localStorage.removeItem("crowdsync_admin_token");
    localStorage.removeItem("crowdsync_admin_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
