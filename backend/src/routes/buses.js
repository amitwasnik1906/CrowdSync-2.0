const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const {
  createBus, getAllBuses, getBus, assignDriver,
  getBusLocation, getBusRoute,
} = require("../controllers/busController");
const { updateBusLocation } = require("../controllers/busLocationController");
const { getBusAttendance } = require("../controllers/attendanceController");

// Bus location update from bus system
router.post("/location", authenticate, authorize("bus_system", "admin"), updateBusLocation);

// Admin-only
router.post("/", authenticate, authorize("admin"), createBus);
router.get("/", authenticate, authorize("admin"), getAllBuses);
router.put("/:busId/assign-driver", authenticate, authorize("admin"), assignDriver);
router.get("/:busId/attendance", authenticate, authorize("admin"), getBusAttendance);

// Accessible to authenticated users
router.get("/:id", authenticate, getBus);
router.get("/:busId/location", authenticate, getBusLocation);
router.get("/:busId/route", authenticate, getBusRoute);

module.exports = router;
