import client, { unwrap } from './client';

export type ParentLoginResponse = {
  token: string;
  parent: { id: number; name: string; phone: string; email?: string | null };
};

export const requestOtp = (phone: string) =>
  client.post('/api/auth/parent/login', { phone }).then(unwrap);

export const verifyOtp = (phone: string, otp: string) =>
  client
    .post('/api/auth/parent/login', { phone, otp })
    .then((r) => unwrap<ParentLoginResponse>(r));
