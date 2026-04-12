import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const client = axios.create({ baseURL: API_URL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("crowdsync_admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("crowdsync_admin_token");
      localStorage.removeItem("crowdsync_admin_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// unwrap { success, data } envelope
export const unwrap = (res) => res.data?.data ?? res.data;

export default client;
