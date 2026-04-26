const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  createDriver, getAllDrivers, getDriver, updateDriver, deleteDriver,
} = require("../controllers/driverController");

// Admin-only
router.post("/", authenticate, authorize("admin"), upload.array("images", 10), createDriver);
router.get("/", authenticate, authorize("admin"), getAllDrivers);
router.put("/:id", authenticate, authorize("admin"), updateDriver);
router.delete("/:id", authenticate, authorize("admin"), deleteDriver);

// Any authenticated user can view driver details
router.get("/:id", authenticate, getDriver);

module.exports = router;
