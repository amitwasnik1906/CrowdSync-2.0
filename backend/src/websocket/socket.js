const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // Auth middleware — expects token via handshake auth or query
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      (socket.handshake.headers?.authorization || "").replace(/^Bearer /i, "");
    if (!token) return next(); // allow unauthenticated read-only clients
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // ignore bad tokens — just treat as unauthenticated
    }
    next();
  });

  io.on("connection", (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    socket.on("joinBus", (busId) => {
      socket.join(`bus_${busId}`);
    });

    socket.on("leaveBus", (busId) => {
      socket.leave(`bus_${busId}`);
    });

    socket.on("joinParent", (parentId) => {
      socket.join(`parent_${parentId}`);
    });

    socket.on("leaveParent", (parentId) => {
      socket.leave(`parent_${parentId}`);
    });

    // Bus device pushes its GPS position via WS
    socket.on("busLocation", async (payload, ack) => {
      try {
        if (!socket.user || !["bus_system", "admin"].includes(socket.user.role)) {
          return ack?.({ ok: false, error: "unauthorized" });
        }
        const { busId, latitude, longitude, speed } = payload || {};
        if (!busId || latitude === undefined || longitude === undefined) {
          return ack?.({ ok: false, error: "busId, latitude, longitude required" });
        }

        await prisma.bus.update({
          where: { id: parseInt(busId) },
          data: { currentLat: latitude, currentLng: longitude },
        });

        io.to(`bus_${busId}`).emit("busLocationUpdate", {
          busId: parseInt(busId),
          latitude,
          longitude,
          speed,
          timestamp: new Date(),
        });

        ack?.({ ok: true });
      } catch (err) {
        console.error("[WS] busLocation error:", err.message);
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on("disconnect", () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = initSocket;
