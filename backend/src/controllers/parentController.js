const prisma = require("../config/prisma");
const { success, error } = require("../utils/response");

// GET /api/parents/:id
async function getParent(req, res, next) {
  try {
    const parent = await prisma.parent.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { id: true, name: true, phone: true, email: true, createdAt: true },
    });

    if (!parent) return error(res, "Parent not found", 404);
    return success(res, parent);
  } catch (err) {
    next(err);
  }
}

// GET /api/parents/:id/students
async function getParentStudents(req, res, next) {
  try {
    const students = await prisma.student.findMany({
      where: { parentId: parseInt(req.params.id) },
      include: { bus: { select: { id: true, busNumber: true, routeName: true } } },
    });

    return success(res, students);
  } catch (err) {
    next(err);
  }
}

// POST /api/parents (ADMIN)
async function createParent(req, res, next) {
  try {
    const { name, phone, email } = req.body;

    if (!name || !phone) {
      return error(res, "Name and phone are required", 400);
    }

    const parent = await prisma.parent.create({
      data: { name, phone, email },
    });

    return success(res, parent, 201);
  } catch (err) {
    next(err);
  }
}

// PUT /api/parents/:id (ADMIN)
async function updateParent(req, res, next) {
  try {
    const { name, phone, email } = req.body;

    const parent = await prisma.parent.update({
      where: { id: parseInt(req.params.id) },
      data: { name, phone, email },
    });

    return success(res, parent);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/parents/:id (ADMIN)
async function deleteParent(req, res, next) {
  try {
    await prisma.parent.delete({
      where: { id: parseInt(req.params.id) },
    });

    return success(res, { message: "Parent deleted successfully" });
  } catch (err) {
    next(err);
  }
}

module.exports = { getParent, getParentStudents, createParent, updateParent, deleteParent };
