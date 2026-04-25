import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TOKEN_KEY = 'crowdsync.token';

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

const client = axios.create({ baseURL: API_URL, timeout: 15000 });

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

export const unwrap = <T,>(res: { data: { data?: T } & T }): T => {
  const body = res.data as any;
  return (body?.data ?? body) as T;
};

export default client;
