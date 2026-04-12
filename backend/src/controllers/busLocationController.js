const prisma = require("../config/prisma");
const { success, error } = require("../utils/response");

// POST /api/buses/location (BUS SYSTEM — also broadcasts via WebSocket)
async function updateBusLocation(req, res, next) {
  try {
    const { busId, latitude, longitude, speed } = req.body;

    if (!busId || latitude === undefined || longitude === undefined) {
      return error(res, "busId, latitude, and longitude are required", 400);
    }

    await prisma.bus.update({
      where: { id: busId },
      data: { currentLat: latitude, currentLng: longitude },
    });

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

    return success(res, { busId, latitude, longitude });
  } catch (err) {
    next(err);
  }
}

module.exports = { updateBusLocation };
