import client, { unwrap } from "./client";

export const listParents = () => client.get("/api/parents").then(unwrap);
export const getParent = (id) => client.get(`/api/parents/${id}`).then(unwrap);
export const getParentStudents = (id) =>
  client.get(`/api/parents/${id}/students`).then(unwrap);
export const createParent = (data) => client.post("/api/parents", data).then(unwrap);
export const updateParent = (id, data) =>
  client.put(`/api/parents/${id}`, data).then(unwrap);
export const deleteParent = (id) => client.delete(`/api/parents/${id}`).then(unwrap);
