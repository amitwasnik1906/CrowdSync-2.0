import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { API_URL } from "../api/client";

let sharedSocket = null;

export function getSocket() {
  if (!sharedSocket) {
    sharedSocket = io(API_URL, { transports: ["websocket", "polling"] });
  }
  return sharedSocket;
}

/**
 * Subscribe to socket events for a specific bus.
 * @param {number} busId
 * @param {{ onLocation?, onEntry?, onExit? }} handlers
 */
export function useBusSocket(busId, handlers) {
  const { onLocation, onEntry, onExit } = handlers;
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!busId) return;
    const socket = getSocket();
    socket.emit("joinBus", busId);

    const loc = (d) => ref.current.onLocation?.(d);
    const entry = (d) => ref.current.onEntry?.(d);
    const exit = (d) => ref.current.onExit?.(d);

    socket.on("busLocationUpdate", loc);
    socket.on("studentEntry", entry);
    socket.on("studentExit", exit);

    return () => {
      socket.emit("leaveBus", busId);
      socket.off("busLocationUpdate", loc);
      socket.off("studentEntry", entry);
      socket.off("studentExit", exit);
    };
  }, [busId]);
}

/**
 * Subscribe to multiple buses at once (for LiveMap).
 */
export function useAllBusesSocket(busIds, onLocation) {
  const ref = useRef(onLocation);
  ref.current = onLocation;

  useEffect(() => {
    if (!busIds?.length) return;
    const socket = getSocket();
    busIds.forEach((id) => socket.emit("joinBus", id));

    const handler = (d) => ref.current?.(d);
    socket.on("busLocationUpdate", handler);

    return () => {
      busIds.forEach((id) => socket.emit("leaveBus", id));
      socket.off("busLocationUpdate", handler);
    };
  }, [busIds?.join(",")]);
}
