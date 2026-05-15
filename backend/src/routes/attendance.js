const express = require("express");
const router = express.Router();
const { authenticate, authorize, authenticateFaceSystem } = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  markEntry,
  markExit,
  markByFace,
  markDriverByFace,
} = require("../controllers/attendanceController");

// Bus system only
router.post("/entry", authenticate, authorize("bus_system", "admin"), markEntry);
router.post("/exit", authenticate, authorize("bus_system", "admin"), markExit);

// Face-recognition system — uses X-API-Key header
router.post("/face", authenticateFaceSystem, markByFace);
router.post(
  "/driver-mark",
  authenticateFaceSystem,
  upload.single("photo"),
  markDriverByFace
);

module.exports = router;
