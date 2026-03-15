const express = require("express");
const router = express.Router();
const { register, login, refresh, logout, logoutAll, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");

router.post("/register", authLimiter, register);
router.post("/login",    authLimiter, login);
router.post("/refresh",  refresh);
router.post("/logout",   logout);
router.post("/logout-all", protect, logoutAll);
router.get("/me",        protect, getMe);

module.exports = router;
