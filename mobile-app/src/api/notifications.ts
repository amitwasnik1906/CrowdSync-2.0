import client, { unwrap } from './client';

export type Notification = {
  id: number;
  parentId: number;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
};

export const listNotifications = (parentId: number) =>
  client.get(`/api/notify/${parentId}`).then((r) => unwrap<Notification[]>(r));
