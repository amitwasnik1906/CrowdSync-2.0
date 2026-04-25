import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import { API_URL } from '@/api/client';
import type { BusLocation } from '@/api/buses';
import type { Notification } from '@/api/notifications';

let sharedSocket: Socket | null = null;

function getSocket() {
  if (!sharedSocket) {
    sharedSocket = io(API_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return sharedSocket;
}

export function useBusSocket(busId: number | null, onLocation: (loc: BusLocation) => void) {
  const cbRef = useRef(onLocation);
  cbRef.current = onLocation;

  useEffect(() => {
    if (!busId) return;
    const socket = getSocket();
    const handler = (loc: BusLocation) => cbRef.current(loc);
    socket.emit('joinBus', busId);
    socket.on('busLocationUpdate', handler);
    return () => {
      socket.emit('leaveBus', busId);
      socket.off('busLocationUpdate', handler);
    };
  }, [busId]);
}

export function useParentSocket(
  parentId: number | null,
  onNotification: (n: Notification) => void
) {
  const cbRef = useRef(onNotification);
  cbRef.current = onNotification;

  useEffect(() => {
    if (!parentId) return;
    const socket = getSocket();
    const handler = (n: Notification) => cbRef.current(n);
    socket.emit('joinParent', parentId);
    socket.on('notification', handler);
    return () => {
      socket.emit('leaveParent', parentId);
      socket.off('notification', handler);
    };
  }, [parentId]);
}

export function useSocketStatus() {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const socket = getSocket();
    setConnected(socket.connected);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);
  return connected;
}
