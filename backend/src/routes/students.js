const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const {
  createStudent, getStudent, updateStudent, deleteStudent,
  getStudentAttendance,
} = require("../controllers/studentController");

// Attendance — parent can view their own student's attendance
router.get("/:studentId/attendance", authenticate, getStudentAttendance);

// Admin-only CRUD
router.post("/", authenticate, authorize("admin"), createStudent);
router.get("/:id", authenticate, authorize("admin"), getStudent);
router.put("/:id", authenticate, authorize("admin"), updateStudent);
router.delete("/:id", authenticate, authorize("admin"), deleteStudent);

module.exports = router;
