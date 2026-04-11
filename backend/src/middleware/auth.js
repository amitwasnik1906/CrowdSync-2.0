const jwt = require("jsonwebtoken");
const { error } = require("../utils/response");

const JWT_SECRET = process.env.JWT_SECRET || "crowdsync-secret-key";

/**
 * Verify JWT token from Authorization header
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return error(res, "Authentication required", 401);
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return error(res, "Invalid or expired token", 401);
  }
}

/**
 * Restrict access to specific roles
 * Usage: authorize("admin"), authorize("parent"), authorize("bus_system")
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return error(res, "Forbidden: insufficient permissions", 403);
    }
    next();
  };
}

/**
 * Generate a JWT token
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

module.exports = { authenticate, authorize, generateToken };
