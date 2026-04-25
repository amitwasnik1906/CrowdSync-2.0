import client, { unwrap } from './client';

export type Bus = {
  id: number;
  busNumber: string;
  routeName: string;
  capacity: number;
  occupancy: number;
  currentLat?: number | null;
  currentLng?: number | null;
  driver?: { id: number; name: string; phone: string } | null;
};

export type BusLocation = {
  busId: number;
  latitude: number;
  longitude: number;
  speed?: number | null;
  timestamp: string;
};

export type BusRoute = {
  id: number;
  busId: number;
  polyline: string;
  stops?: { name: string; lat: number; lng: number }[] | null;
};

type RawBusLocation = {
  id: number;
  busNumber?: string;
  currentLat: number | null;
  currentLng: number | null;
  occupancy?: number;
  capacity?: number;
};

export const getBus = (id: number) =>
  client.get(`/api/buses/${id}`).then((r) => unwrap<Bus>(r));

export const getBusLocation = (id: number): Promise<BusLocation | null> =>
  client.get(`/api/buses/${id}/location`).then((r) => {
    const raw = unwrap<RawBusLocation>(r);
    if (raw?.currentLat == null || raw?.currentLng == null) return null;
    return {
      busId: raw.id,
      latitude: raw.currentLat,
      longitude: raw.currentLng,
      speed: null,
      timestamp: new Date().toISOString(),
    };
  });

export const getBusRoute = (id: number) =>
  client.get(`/api/buses/${id}/route`).then((r) => unwrap<BusRoute>(r));
