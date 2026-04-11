const prisma = require("../config/prisma");
const { success, error } = require("../utils/response");

// POST /api/drivers (ADMIN)
async function createDriver(req, res, next) {
  try {
    const { name, phone, licenseNumber, busId } = req.body;

    if (!name || !phone || !licenseNumber) {
      return error(res, "name, phone, and licenseNumber are required", 400);
    }

    const driver = await prisma.driver.create({
      data: { name, phone, licenseNumber, busId: busId || null },
      include: { bus: { select: { id: true, busNumber: true } } },
    });

    return success(res, driver, 201);
  } catch (err) {
    next(err);
  }
}

// GET /api/drivers (ADMIN)
async function getAllDrivers(req, res, next) {
  try {
    const drivers = await prisma.driver.findMany({
      include: { bus: { select: { id: true, busNumber: true, routeName: true } } },
    });

    return success(res, drivers);
  } catch (err) {
    next(err);
  }
}

// GET /api/drivers/:id
async function getDriver(req, res, next) {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { bus: { select: { id: true, busNumber: true, routeName: true } } },
    });

    if (!driver) return error(res, "Driver not found", 404);
    return success(res, driver);
  } catch (err) {
    next(err);
  }
}

// PUT /api/drivers/:id (ADMIN)
async function updateDriver(req, res, next) {
  try {
    const { name, phone, licenseNumber, busId } = req.body;

    const driver = await prisma.driver.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(licenseNumber && { licenseNumber }),
        ...(busId !== undefined && { busId }),
      },
      include: { bus: { select: { id: true, busNumber: true } } },
    });

    return success(res, driver);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/drivers/:id (ADMIN)
async function deleteDriver(req, res, next) {
  try {
    await prisma.driver.delete({
      where: { id: parseInt(req.params.id) },
    });

    return success(res, { message: "Driver deleted successfully" });
  } catch (err) {
    next(err);
  }
}

module.exports = { createDriver, getAllDrivers, getDriver, updateDriver, deleteDriver };
