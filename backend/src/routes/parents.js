const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const {
  getParent, getParentStudents,
  createParent, updateParent, deleteParent,
} = require("../controllers/parentController");

// Parent can view own profile; admin can view any
router.get("/:id", authenticate, getParent);
router.get("/:id/students", authenticate, getParentStudents);

// Admin-only management
router.post("/", authenticate, authorize("admin"), createParent);
router.put("/:id", authenticate, authorize("admin"), updateParent);
router.delete("/:id", authenticate, authorize("admin"), deleteParent);

module.exports = router;
