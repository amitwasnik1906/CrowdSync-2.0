const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const { markEntry, markExit } = require("../controllers/attendanceController");

// Bus system only
router.post("/entry", authenticate, authorize("bus_system", "admin"), markEntry);
router.post("/exit", authenticate, authorize("bus_system", "admin"), markExit);

module.exports = router;
