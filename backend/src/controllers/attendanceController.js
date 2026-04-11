const prisma = require("../config/prisma");
const { success, error } = require("../utils/response");

// POST /api/attendance/entry (BUS SYSTEM)
async function markEntry(req, res, next) {
  try {
    const { studentId, busId } = req.body;

    if (!studentId || !busId) {
      return error(res, "studentId and busId are required", 400);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already boarded today
    const existing = await prisma.attendance.findFirst({
      where: { studentId, busId, date: today, exitTime: null },
    });

    if (existing) {
      return error(res, "Student already boarded this bus today", 409);
    }

    const attendance = await prisma.attendance.create({
      data: {
        studentId,
        busId,
        entryTime: new Date(),
        date: today,
      },
      include: {
        student: { select: { id: true, name: true, parentId: true } },
      },
    });

    // Increment bus occupancy
    await prisma.bus.update({
      where: { id: busId },
      data: { occupancy: { increment: 1 } },
    });

    // Emit WebSocket event
    const io = req.app.get("io");
    if (io) {
      io.to(`bus_${busId}`).emit("studentEntry", {
        studentId: attendance.student.id,
        studentName: attendance.student.name,
        busId,
        entryTime: attendance.entryTime,
      });
    }

    return success(res, attendance, 201);
  } catch (err) {
    next(err);
  }
}

// POST /api/attendance/exit (BUS SYSTEM)
async function markExit(req, res, next) {
  try {
    const { studentId, busId } = req.body;

    if (!studentId || !busId) {
      return error(res, "studentId and busId are required", 400);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findFirst({
      where: { studentId, busId, date: today, exitTime: null },
      orderBy: { createdAt: "desc" },
    });

    if (!attendance) {
      return error(res, "No active entry found for this student on this bus today", 404);
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { exitTime: new Date() },
      include: {
        student: { select: { id: true, name: true, parentId: true } },
      },
    });

    // Decrement bus occupancy
    await prisma.bus.update({
      where: { id: busId },
      data: { occupancy: { decrement: 1 } },
    });

    // Emit WebSocket event
    const io = req.app.get("io");
    if (io) {
      io.to(`bus_${busId}`).emit("studentExit", {
        studentId: updated.student.id,
        studentName: updated.student.name,
        busId,
        exitTime: updated.exitTime,
      });
    }

    return success(res, updated);
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
      orderBy: { createdAt: "desc" },
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

module.exports = { markEntry, markExit, getBusAttendance };
