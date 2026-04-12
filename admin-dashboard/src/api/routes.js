import client, { unwrap } from "./client";

export const createRoute = (data) => client.post("/api/routes", data).then(unwrap);
export const updateRoute = (busId, data) =>
  client.put(`/api/routes/${busId}`, data).then(unwrap);
