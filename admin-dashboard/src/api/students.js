import client, { unwrap } from "./client";

export const listStudents = () => client.get("/api/students").then(unwrap);
export const getStudent = (id) => client.get(`/api/students/${id}`).then(unwrap);
export const createStudent = (data) => {
  // data may be a FormData (multipart upload) or plain object (legacy).
  // Let axios set Content-Type / boundary automatically — don't override.
  const isMultipart = typeof FormData !== "undefined" && data instanceof FormData;
  const config = isMultipart ? { headers: { "Content-Type": "multipart/form-data" } } : undefined;
  return client.post("/api/students", data, config).then(unwrap);
};
export const updateStudent = (id, data) =>
  client.put(`/api/students/${id}`, data).then(unwrap);
export const deleteStudent = (id) => client.delete(`/api/students/${id}`).then(unwrap);
export const getStudentAttendance = (id, params = {}) =>
  client.get(`/api/students/${id}/attendance`, { params }).then(unwrap);
