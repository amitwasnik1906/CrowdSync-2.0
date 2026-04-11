const express = require("express");
const router = express.Router();
const { parentLogin, adminLogin, adminRegister } = require("../controllers/authController");

router.post("/parent/login", parentLogin);
router.post("/admin/login", adminLogin);
router.post("/admin/register", adminRegister);

module.exports = router;
