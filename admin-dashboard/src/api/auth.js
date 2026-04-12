import client, { unwrap } from "./client";

export const adminLogin = (email, password) =>
  client.post("/api/auth/admin/login", { email, password }).then(unwrap);

export const adminRegister = (name, email, password) =>
  client.post("/api/auth/admin/register", { name, email, password }).then(unwrap);
