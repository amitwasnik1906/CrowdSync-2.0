import client, { unwrap } from './client';

export type AttendanceRecord = {
  id: number;
  studentId: number;
  busId: number;
  type: 'entry' | 'exit';
  time: string;
  locationName?: string | null;
  date: string;
  createdAt: string;
};

export const getStudentAttendance = (studentId: number) =>
  client
    .get(`/api/students/${studentId}/attendance`)
    .then((r) => unwrap<AttendanceRecord[]>(r));
