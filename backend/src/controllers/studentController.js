const prisma = require("../config/prisma");
const { success, error } = require("../utils/response");
const driveService = require("../services/driveService");

// GET /api/students (ADMIN)
async function listStudents(req, res, next) {
  try {
    const students = await prisma.student.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        parent: { select: { id: true, name: true, phone: true } },
        bus: { select: { id: true, busNumber: true, routeName: true } },
      },
    });
    return success(res, students);
  } catch (err) {
    next(err);
  }
}

// POST /api/students (ADMIN)
// Multipart: text fields (name, class, parentId, busId) + images[] file field.
// faceId is generated server-side from the new Drive folder ID.
async function createStudent(req, res, next) {
  const { name, class: className } = req.body;
  const parentId = parseInt(req.body.parentId, 10);
  const busId = parseInt(req.body.busId, 10);
  const files = req.files || [];

  if (!name || !className || !parentId || !busId) {
    return error(res, "All fields are required: name, class, parentId, busId", 400);
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

    const student = await prisma.student.create({
      data: { name, class: className, faceId: folderId, parentId, busId },
      include: {
        parent: { select: { id: true, name: true, phone: true } },
        bus: { select: { id: true, busNumber: true, routeName: true } },
      },
    });

    return success(res, student, 201);
  } catch (err) {
    if (folderId) {
      await driveService.deleteFolder(folderId);
    }
    next(err);
  }
}

// GET /api/students/:id (ADMIN)
async function getStudent(req, res, next) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        parent: { select: { id: true, name: true, phone: true } },
        bus: { select: { id: true, busNumber: true, routeName: true } },
      },
    });

    if (!student) return error(res, "Student not found", 404);
    return success(res, student);
  } catch (err) {
    next(err);
  }
}

// PUT /api/students/:id (ADMIN)
async function updateStudent(req, res, next) {
  try {
    const { name, class: className, faceId, parentId, busId } = req.body;

    const student = await prisma.student.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(className && { class: className }),
        ...(faceId && { faceId }),
        ...(parentId && { parentId }),
        ...(busId && { busId }),
      },
      include: {
        parent: { select: { id: true, name: true, phone: true } },
        bus: { select: { id: true, busNumber: true, routeName: true } },
      },
    });

    return success(res, student);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/students/:id (ADMIN)
async function deleteStudent(req, res, next) {
  try {
    await prisma.student.delete({
      where: { id: parseInt(req.params.id) },
    });

    return success(res, { message: "Student deleted successfully" });
  } catch (err) {
    next(err);
  }
}

// GET /api/students/:studentId/attendance
async function getStudentAttendance(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const studentId = parseInt(req.params.studentId);

    const where = { studentId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const attendance = await prisma.attendance.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        bus: { select: { id: true, busNumber: true, routeName: true } },
      },
    });

    return success(res, attendance);
  } catch (err) {
    next(err);
  }
}

module.exports = { listStudents, createStudent, getStudent, updateStudent, deleteStudent, getStudentAttendance };
