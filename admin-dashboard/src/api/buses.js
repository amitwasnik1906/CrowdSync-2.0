import client, { unwrap } from "./client";

export const listBuses = () => client.get("/api/buses").then(unwrap);
export const getBus = (id) => client.get(`/api/buses/${id}`).then(unwrap);
export const createBus = (data) => client.post("/api/buses", data).then(unwrap);
export const assignDriver = (busId, driverId) =>
  client.put(`/api/buses/${busId}/assign-driver`, { driverId }).then(unwrap);
export const getBusLocation = (busId) =>
  client.get(`/api/buses/${busId}/location`).then(unwrap);
export const getBusRoute = (busId) =>
  client.get(`/api/buses/${busId}/route`).then(unwrap);
export const getBusLocationHistory = (busId) =>
  client.get(`/api/buses/${busId}/location-history`).then(unwrap);
export const getBusAttendance = (busId, date) =>
  client.get(`/api/buses/${busId}/attendance`, { params: { date } }).then(unwrap);
