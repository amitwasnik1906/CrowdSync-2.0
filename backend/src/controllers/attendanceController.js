const prisma = require("../config/prisma");
const { success, error } = require("../utils/response");
const { reverseGeocode } = require("../utils/geocode");
const cloudinaryService = require("../services/cloudinaryService");

// Shared logic: write one Attendance row for the given event and emit a WS event.
async function recordEvent(req, { studentId, busId, type, latitude, longitude }) {
  if (type !== "entry" && type !== "exit") {
    throw new Error(`Invalid attendance type: ${type}`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const locationName =
    latitude !== undefined && longitude !== undefined
      ? await reverseGeocode(latitude, longitude)
      : null;

  const attendance = await prisma.attendance.create({
    data: {
      studentId,
      busId,
      type,
      time: new Date(),
      locationName,
      date: today,
    },
    include: {
      student: { select: { id: true, name: true, parentId: true } },
    },
  });

  await prisma.bus.update({
    where: { id: busId },
    data: { occupancy: { [type === "entry" ? "increment" : "decrement"]: 1 } },
  });

  const io = req.app.get("io");
  if (io) {
    const event = type === "entry" ? "studentEntry" : "studentExit";
    io.to(`bus_${busId}`).emit(event, {
      studentId: attendance.student.id,
      studentName: attendance.student.name,
      busId,
      time: attendance.time,
      locationName: attendance.locationName,
    });
  }

  return attendance;
}

// POST /api/attendance/entry (BUS SYSTEM)
async function markEntry(req, res, next) {
  try {
    const { studentId, busId, latitude, longitude } = req.body;
    if (!studentId || !busId) {
      return error(res, "studentId and busId are required", 400);
    }
    const attendance = await recordEvent(req, {
      studentId, busId, type: "entry", latitude, longitude,
    });
    return success(res, attendance, 201);
  } catch (err) {
    next(err);
  }
}

// POST /api/attendance/exit (BUS SYSTEM)
async function markExit(req, res, next) {
  try {
    const { studentId, busId, latitude, longitude } = req.body;
    if (!studentId || !busId) {
      return error(res, "studentId and busId are required", 400);
    }
    const attendance = await recordEvent(req, {
      studentId, busId, type: "exit", latitude, longitude,
    });
    return success(res, attendance, 201);
  } catch (err) {
    next(err);
  }
}

// GET /api/buses/:busId/attendance (ADMIN)
async function getBusAttendance(req, res, next) {
  try {
    const busId = parseInt(req.params.busId);
    const { date } = req.query;

    const where = { busId };
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      where.date = d;
    }

    const attendance = await prisma.attendance.findMany({
      where,
      orderBy: { time: "desc" },
      include: {
        student: {
          select: { id: true, name: true, class: true },
        },
      },
    });

    return success(res, attendance);
  } catch (err) {
    next(err);
  }
}

// POST /api/attendance/face (FACE-RECOGNITION SYSTEM via X-API-Key)
// Body: { faceId, mode: "entry" | "exit", latitude?, longitude? }
async function markByFace(req, res, next) {
  try {
    const { faceId, mode, latitude, longitude } = req.body;

    if (!faceId || !mode) {
      return error(res, "faceId and mode are required", 400);
    }
    if (mode !== "entry" && mode !== "exit") {
      return error(res, "mode must be 'entry' or 'exit'", 400);
    }

    // If the face belongs to a driver, record them on today's BusDailyHistory
    // instead of marking student attendance.
    const driver = await prisma.driver.findUnique({
      where: { faceId },
      select: { id: true, name: true, phone: true, busId: true },
    });

    if (driver) {
      if (driver.busId == null) {
        return error(res, `Driver '${driver.name}' is not assigned to any bus`, 400);
      }

      const now = new Date();
      const today = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );

      const history = await prisma.busDailyHistory.upsert({
        where: { busId_date: { busId: driver.busId, date: today } },
        create: {
          busId: driver.busId,
          date: today,
          driverId: driver.id,
          driverName: driver.name,
          driverPhone: driver.phone,
          points: [],
        },
        update: {
          driverId: driver.id,
          driverName: driver.name,
          driverPhone: driver.phone,
        },
      });

      return success(
        res,
        {
          type: "driver",
          driverId: driver.id,
          driverName: driver.name,
          busId: driver.busId,
          date: history.date.toISOString().slice(0, 10),
        },
        200
      );
    }

    const student = await prisma.student.findUnique({
      where: { faceId },
      select: { id: true, busId: true },
    });

    if (!student) {
      return error(res, `No student or driver found for faceId '${faceId}'`, 404);
    }

    const attendance = await recordEvent(req, {
      studentId: student.id,
      busId: student.busId,
      type: mode,
      latitude,
      longitude,
    });

    return success(res, attendance, 201);
  } catch (err) {
    next(err);
  }
}

// POST /api/attendance/driver-mark (FACE-RECOGNITION SYSTEM via X-API-Key)
// Multipart: text field `faceId` + file field `photo`.
// Returns 404 "Not a driver" so the Python client can fall back to /face for
// student attendance.
async function markDriverByFace(req, res, next) {
  try {
    const { faceId } = req.body;

    if (!faceId) {
      return error(res, "faceId is required", 400);
    }
    if (!req.file) {
      return error(res, "photo file is required", 400);
    }

    const driver = await prisma.driver.findUnique({
      where: { faceId },
      select: { id: true, name: true, phone: true, busId: true },
    });

    if (!driver) {
      return error(res, "Not a driver", 404);
    }
    if (driver.busId == null) {
      return error(res, `Driver '${driver.name}' is not assigned to any bus`, 400);
    }

    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    const existing = await prisma.busDailyHistory.findUnique({
      where: { busId_date: { busId: driver.busId, date: today } },
      select: { driverPhotoPublicId: true },
    });
    const oldPublicId = existing?.driverPhotoPublicId || null;

    const uploaded = await cloudinaryService.uploadDriverPhoto(
      req.file.buffer,
      req.file.mimetype,
      { busId: driver.busId, date: today }
    );

    const history = await prisma.busDailyHistory.upsert({
      where: { busId_date: { busId: driver.busId, date: today } },
      create: {
        busId: driver.busId,
        date: today,
        driverId: driver.id,
        driverName: driver.name,
        driverPhone: driver.phone,
        driverPhoto: uploaded.url,
        driverPhotoPublicId: uploaded.publicId,
        points: [],
      },
      update: {
        driverId: driver.id,
        driverName: driver.name,
        driverPhone: driver.phone,
        driverPhoto: uploaded.url,
        driverPhotoPublicId: uploaded.publicId,
      },
    });

    if (oldPublicId && oldPublicId !== uploaded.publicId) {
      cloudinaryService.deletePhoto(oldPublicId).catch(() => {});
    }

    return success(
      res,
      {
        type: "driver",
        driverId: driver.id,
        driverName: driver.name,
        busId: driver.busId,
        driverPhoto: history.driverPhoto,
        date: history.date.toISOString().slice(0, 10),
      },
      200
    );
  } catch (err) {
    next(err);
  }
}

module.exports = { markEntry, markExit, markByFace, markDriverByFace, getBusAttendance };
