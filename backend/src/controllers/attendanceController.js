const prisma = require("../config/prisma");
const { success, error } = require("../utils/response");
const { reverseGeocode } = require("../utils/geocode");

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

    const student = await prisma.student.findUnique({
      where: { faceId },
      select: { id: true, busId: true },
    });

    if (!student) {
      return error(res, `No student found for faceId '${faceId}'`, 404);
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

module.exports = { markEntry, markExit, markByFace, getBusAttendance };
