const prisma = require("../config/prisma");
const { success, error } = require("../utils/response");

// POST /api/routes (ADMIN)
async function createRoute(req, res, next) {
  try {
    const { busId, polyline, stops } = req.body;

    if (!busId || !polyline) {
      return error(res, "busId and polyline are required", 400);
    }

    const route = await prisma.busRoute.create({
      data: { busId, polyline, stops: stops || null },
    });

    return success(res, route, 201);
  } catch (err) {
    next(err);
  }
}

// PUT /api/routes/:busId (ADMIN)
async function updateRoute(req, res, next) {
  try {
    const busId = parseInt(req.params.busId);
    const { polyline, stops } = req.body;

    const route = await prisma.busRoute.update({
      where: { busId },
      data: {
        ...(polyline && { polyline }),
        ...(stops !== undefined && { stops }),
      },
    });

    return success(res, route);
  } catch (err) {
    next(err);
  }
}

module.exports = { createRoute, updateRoute };
