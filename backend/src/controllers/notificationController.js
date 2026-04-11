const prisma = require("../config/prisma");
const { success, error } = require("../utils/response");

// POST /api/notify (BUS SYSTEM)
async function sendNotification(req, res, next) {
  try {
    const { parentId, title, body, type } = req.body;

    if (!parentId || !title || !body || !type) {
      return error(res, "parentId, title, body, and type are required", 400);
    }

    const notification = await prisma.notification.create({
      data: { parentId, title, body, type },
    });

    // Emit via WebSocket to the specific parent
    const io = req.app.get("io");
    if (io) {
      io.to(`parent_${parentId}`).emit("notification", {
        id: notification.id,
        title,
        body,
        type,
        createdAt: notification.createdAt,
      });
    }

    return success(res, notification, 201);
  } catch (err) {
    next(err);
  }
}

// GET /api/notifications/:parentId
async function getNotifications(req, res, next) {
  try {
    const parentId = parseInt(req.params.parentId);

    const notifications = await prisma.notification.findMany({
      where: { parentId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return success(res, notifications);
  } catch (err) {
    next(err);
  }
}

module.exports = { sendNotification, getNotifications };
