const prisma = require("../config/prisma");
const { success, error } = require("../utils/response");

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
async function createStudent(req, res, next) {
  try {
    const { name, class: className, faceId, parentId, busId } = req.body;

    if (!name || !className || !faceId || !parentId || !busId) {
      return error(res, "All fields are required: name, class, faceId, parentId, busId", 400);
    }

    const student = await prisma.student.create({
      data: { name, class: className, faceId, parentId, busId },
      include: {
        parent: { select: { id: true, name: true, phone: true } },
        bus: { select: { id: true, busNumber: true, routeName: true } },
      },
    });

    return success(res, student, 201);
  } catch (err) {
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
