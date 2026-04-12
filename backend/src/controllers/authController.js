const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { generateToken } = require("../middleware/auth");
const { success, error } = require("../utils/response");

/**
 * POST /api/auth/parent/login
 * Step 1: Send OTP — POST with { phone }
 * Step 2: Verify OTP — POST with { phone, otp }
 */
async function parentLogin(req, res, next) {
  try {
    const { phone, otp } = req.body;

    if (!phone) {
      return error(res, "Phone number is required", 400);
    }

    // Step 1: Request OTP
    if (!otp) {
      const parent = await prisma.parent.findUnique({ where: { phone } });
      if (!parent) {
        return error(res, "No parent account found with this phone number", 404);
      }

      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      await prisma.otp.create({
        data: { phone, code, expiresAt },
      });

      // In production, send OTP via SMS (Twilio, etc.)
      console.log(`[OTP] ${phone}: ${code}`);

      return success(res, { 
        message: "OTP sent successfully",
        otpExpiresAt: expiresAt.toISOString(),
      });
    }

    // Step 2: Verify OTP
    const otpRecord = await prisma.otp.findFirst({
      where: {
        phone,
        code: otp,
        verified: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return error(res, "Invalid or expired OTP", 401);
    }

    await prisma.otp.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    const parent = await prisma.parent.findUnique({ where: { phone } });
    const token = generateToken({ id: parent.id, role: "parent" });

    return success(res, {
      token,
      parent: { id: parent.id, name: parent.name, phone: parent.phone },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/admin/login
 * Body: { email, password }
 */
async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, "Email and password are required", 400);
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      return error(res, "Invalid credentials", 401);
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return error(res, "Invalid credentials", 401);
    }

    const token = generateToken({ id: admin.id, role: "admin" });

    return success(res, {
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/admin/register
 * Body: { name, email, password }
 * (Use this to seed the first admin, then protect or remove)
 */
async function adminRegister(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return error(res, "Name, email, and password are required", 400);
    }

    const hashed = await bcrypt.hash(password, 10);

    const admin = await prisma.admin.create({
      data: { name, email, password: hashed },
    });

    const token = generateToken({ id: admin.id, role: "admin" });

    return success(res, {
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    }, 201);
  } catch (err) {
    next(err);
  }
}

module.exports = { parentLogin, adminLogin, adminRegister };
