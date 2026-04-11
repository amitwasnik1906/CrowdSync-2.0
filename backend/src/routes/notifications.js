const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const { sendNotification, getNotifications } = require("../controllers/notificationController");

// Bus system sends notifications
router.post("/", authenticate, authorize("bus_system", "admin"), sendNotification);

// Parent views their notifications
router.get("/:parentId", authenticate, getNotifications);

module.exports = router;
