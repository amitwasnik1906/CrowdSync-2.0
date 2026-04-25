import client, { unwrap } from './client';

export type Student = {
  id: number;
  name: string;
  class: string;
  faceId: string;
  parentId: number;
  busId: number;
  bus?: { id: number; busNumber: string; routeName: string };
};

export type Parent = {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
};

export const getParent = (id: number) =>
  client.get(`/api/parents/${id}`).then((r) => unwrap<Parent>(r));

export const getParentStudents = (id: number) =>
  client.get(`/api/parents/${id}/students`).then((r) => unwrap<Student[]>(r));
