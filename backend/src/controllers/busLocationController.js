const prisma = require("../config/prisma");
const { success, error } = require("../utils/response");

// Minimum distance (meters) or time (seconds) before saving a new location record
const MIN_DISTANCE_METERS = 50;
const MIN_TIME_SECONDS = 30;

// Haversine formula — returns distance between two coordinates in meters
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// POST /api/buses/location (BUS SYSTEM — also broadcasts via WebSocket)
async function updateBusLocation(req, res, next) {
  try {
    const { busId, latitude, longitude, speed } = req.body;

    if (!busId || latitude === undefined || longitude === undefined) {
      return error(res, "busId, latitude, and longitude are required", 400);
    }

    // Always update the live position on the bus record
    await prisma.bus.update({
      where: { id: busId },
      data: { currentLat: latitude, currentLng: longitude },
    });

    // Always broadcast via WebSocket (clients need real-time updates)
    const io = req.app.get("io");
    if (io) {
      io.to(`bus_${busId}`).emit("busLocationUpdate", {
        busId,
        latitude,
        longitude,
        speed,
        timestamp: new Date(),
      });
    }

    // Only save to history if bus moved enough distance or enough time has passed
    const lastLocation = await prisma.busLocation.findFirst({
      where: { busId },
      orderBy: { timestamp: "desc" },
    });

    let shouldSave = true;

    if (lastLocation) {
      const distance = getDistanceMeters(
        lastLocation.latitude, lastLocation.longitude,
        latitude, longitude
      );
      const timeDiff = (Date.now() - lastLocation.timestamp.getTime()) / 1000;

      shouldSave = distance >= MIN_DISTANCE_METERS || timeDiff >= MIN_TIME_SECONDS;
    }

    let savedLocation = null;
    if (shouldSave) {
      savedLocation = await prisma.busLocation.create({
        data: { busId, latitude, longitude, speed: speed || null },
      });
    }

    return success(res, {
      busId,
      latitude,
      longitude,
      saved: shouldSave,
      location: savedLocation,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { updateBusLocation };
