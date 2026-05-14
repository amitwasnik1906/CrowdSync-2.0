const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

const DB_WRITE_THROTTLE_MS = 1000;
const lastDbWriteAt = new Map(); // busId -> timestamp

const HISTORY_MIN_DISTANCE_M = 1000;
const historyCache = new Map(); // busId -> { dateKey, lastLat, lastLng, recordId }

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function utcDateOnly(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function recordHistoryPoint(busId, latitude, longitude) {
  const now = new Date();
  const today = utcDateOnly(now);
  const dateKey = today.toISOString().slice(0, 10);

  let cached = historyCache.get(busId);

  if (!cached || cached.dateKey !== dateKey) {
    const existing = await prisma.busDailyHistory.findUnique({
      where: { busId_date: { busId, date: today } },
    });

    if (existing) {
      const pts = Array.isArray(existing.points) ? existing.points : [];
      const last = pts[pts.length - 1];
      cached = {
        dateKey,
        recordId: existing.id,
        lastLat: last?.lat ?? latitude,
        lastLng: last?.lng ?? longitude,
      };
      historyCache.set(busId, cached);
    } else {
      const bus = await prisma.bus.findUnique({
        where: { id: busId },
        include: { driver: { select: { id: true, name: true, phone: true } } },
      });
      const firstPoint = { lat: latitude, lng: longitude, timestamp: now.toISOString() };
      const created = await prisma.busDailyHistory.create({
        data: {
          busId,
          date: today,
          driverId: bus?.driver?.id ?? null,
          driverName: bus?.driver?.name ?? null,
          driverPhone: bus?.driver?.phone ?? null,
          points: [firstPoint],
        },
      });
      cached = { dateKey, recordId: created.id, lastLat: latitude, lastLng: longitude };
      historyCache.set(busId, cached);
      return;
    }
  }

  const dist = haversineMeters(cached.lastLat, cached.lastLng, latitude, longitude);
  if (dist < HISTORY_MIN_DISTANCE_M) return;

  const newPoint = { lat: latitude, lng: longitude, timestamp: now.toISOString() };
  await prisma.$executeRaw`
    UPDATE "BusDailyHistory"
    SET points = points || ${JSON.stringify([newPoint])}::jsonb,
        "updatedAt" = NOW()
    WHERE id = ${cached.recordId}
  `;
  cached.lastLat = latitude;
  cached.lastLng = longitude;
}

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

        const id = parseInt(busId);
        const now = Date.now();
        const last = lastDbWriteAt.get(id) || 0;
        if (now - last >= DB_WRITE_THROTTLE_MS) {
          lastDbWriteAt.set(id, now);
          prisma.bus
            .update({
              where: { id },
              data: { currentLat: latitude, currentLng: longitude },
            })
            .catch((e) => console.error("[WS] db update failed:", e.message));
        }

        io.to(`bus_${busId}`).emit("busLocationUpdate", {
          busId: parseInt(busId),
          latitude,
          longitude,
          speed,
          timestamp: new Date(),
        });

        recordHistoryPoint(id, latitude, longitude).catch((e) =>
          console.error("[WS] history append failed:", e.message)
        );

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
