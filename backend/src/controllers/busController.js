const prisma = require("../config/prisma");
const { success, error } = require("../utils/response");

// POST /api/buses (ADMIN)
async function createBus(req, res, next) {
  try {
    const { busNumber, routeName, capacity } = req.body;

    if (!busNumber || !routeName || !capacity) {
      return error(res, "busNumber, routeName, and capacity are required", 400);
    }

    const bus = await prisma.bus.create({
      data: { busNumber, routeName, capacity },
    });

    return success(res, bus, 201);
  } catch (err) {
    next(err);
  }
}

// GET /api/buses (ADMIN)
async function getAllBuses(req, res, next) {
  try {
    const buses = await prisma.bus.findMany({
      include: {
        driver: { select: { id: true, name: true, phone: true } },
        _count: { select: { students: true } },
      },
    });

    return success(res, buses);
  } catch (err) {
    next(err);
  }
}

// GET /api/buses/:id
async function getBus(req, res, next) {
  try {
    const bus = await prisma.bus.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        driver: { select: { id: true, name: true, phone: true } },
        route: true,
        _count: { select: { students: true } },
      },
    });

    if (!bus) return error(res, "Bus not found", 404);
    return success(res, bus);
  } catch (err) {
    next(err);
  }
}

// PUT /api/buses/:busId/assign-driver (ADMIN)
async function assignDriver(req, res, next) {
  try {
    const busId = parseInt(req.params.busId);
    const { driverId } = req.body;

    if (!driverId) {
      return error(res, "driverId is required", 400);
    }

    // Unassign driver from any previous bus
    await prisma.driver.updateMany({
      where: { busId },
      data: { busId: null },
    });

    // Assign driver to this bus
    const driver = await prisma.driver.update({
      where: { id: driverId },
      data: { busId },
    });

    return success(res, { message: "Driver assigned successfully", driver });
  } catch (err) {
    next(err);
  }
}

// GET /api/buses/:busId/location
async function getBusLocation(req, res, next) {
  try {
    const bus = await prisma.bus.findUnique({
      where: { id: parseInt(req.params.busId) },
      select: { id: true, busNumber: true, currentLat: true, currentLng: true, occupancy: true, capacity: true },
    });

    if (!bus) return error(res, "Bus not found", 404);
    return success(res, bus);
  } catch (err) {
    next(err);
  }
}

// GET /api/buses/:busId/route
async function getBusRoute(req, res, next) {
  try {
    const route = await prisma.busRoute.findUnique({
      where: { busId: parseInt(req.params.busId) },
    });

    if (!route) return error(res, "Route not found for this bus", 404);
    return success(res, route);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/buses/:id (ADMIN)
async function deleteBus(req, res, next) {
  try {
    const busId = parseInt(req.params.id);
    if (Number.isNaN(busId)) return error(res, "Invalid bus id", 400);

    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      include: { _count: { select: { students: true } } },
    });
    if (!bus) return error(res, "Bus not found", 404);

    if (bus._count.students > 0) {
      return error(
        res,
        `Cannot delete: ${bus._count.students} student(s) are still assigned to this bus. Reassign them first.`,
        409
      );
    }

    await prisma.$transaction([
      prisma.driver.updateMany({ where: { busId }, data: { busId: null } }),
      prisma.busRoute.deleteMany({ where: { busId } }),
      prisma.attendance.deleteMany({ where: { busId } }),
      prisma.bus.delete({ where: { id: busId } }),
    ]);

    return success(res, { message: "Bus deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBus, getAllBuses, getBus, assignDriver, deleteBus,
  getBusLocation, getBusRoute,
};
