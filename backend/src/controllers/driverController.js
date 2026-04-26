const prisma = require("../config/prisma");
const { success, error } = require("../utils/response");
const driveService = require("../services/driveService");

// POST /api/drivers (ADMIN)
// Multipart: text fields (name, phone, licenseNumber, busId) + images[] file field.
// faceId is generated server-side from the new Drive folder ID.
async function createDriver(req, res, next) {
  const { name, phone, licenseNumber } = req.body;
  const busId = req.body.busId ? parseInt(req.body.busId, 10) : null;
  const files = req.files || [];

  if (!name || !phone || !licenseNumber) {
    return error(res, "name, phone, and licenseNumber are required", 400);
  }
  if (files.length === 0) {
    return error(res, "At least one face image is required", 400);
  }

  let folderId = null;
  try {
    const folder = await driveService.createPersonFolder(name);
    folderId = folder.folderId;

    for (const f of files) {
      await driveService.uploadImage(folderId, f.buffer, f.mimetype, f.originalname);
    }

    const driver = await prisma.driver.create({
      data: { name, phone, licenseNumber, faceId: folderId, busId },
      include: { bus: { select: { id: true, busNumber: true } } },
    });

    return success(res, driver, 201);
  } catch (err) {
    if (folderId) {
      await driveService.deleteFolder(folderId);
    }
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
