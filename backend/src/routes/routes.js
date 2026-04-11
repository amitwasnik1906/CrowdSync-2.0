const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const { createRoute, updateRoute } = require("../controllers/routeController");

// Admin-only
router.post("/", authenticate, authorize("admin"), createRoute);
router.put("/:busId", authenticate, authorize("admin"), updateRoute);

module.exports = router;
