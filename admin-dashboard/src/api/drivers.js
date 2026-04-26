import client, { unwrap } from "./client";

export const listDrivers = () => client.get("/api/drivers").then(unwrap);
export const getDriver = (id) => client.get(`/api/drivers/${id}`).then(unwrap);
export const createDriver = (data) => {
  const isMultipart = typeof FormData !== "undefined" && data instanceof FormData;
  const config = isMultipart ? { headers: { "Content-Type": "multipart/form-data" } } : undefined;
  return client.post("/api/drivers", data, config).then(unwrap);
};
export const updateDriver = (id, data) =>
  client.put(`/api/drivers/${id}`, data).then(unwrap);
export const deleteDriver = (id) => client.delete(`/api/drivers/${id}`).then(unwrap);
