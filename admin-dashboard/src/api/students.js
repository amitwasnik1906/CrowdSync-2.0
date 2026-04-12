import client, { unwrap } from "./client";

export const listStudents = () => client.get("/api/students").then(unwrap);
export const getStudent = (id) => client.get(`/api/students/${id}`).then(unwrap);
export const createStudent = (data) => client.post("/api/students", data).then(unwrap);
export const updateStudent = (id, data) =>
  client.put(`/api/students/${id}`, data).then(unwrap);
export const deleteStudent = (id) => client.delete(`/api/students/${id}`).then(unwrap);
export const getStudentAttendance = (id, params = {}) =>
  client.get(`/api/students/${id}/attendance`, { params }).then(unwrap);
