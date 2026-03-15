const User = require("../models/User");
const {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} = require("../utils/generateTokens");

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// @desc   Register user
// @route  POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, vehicle } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || "passenger",
      phone,
      vehicle: role === "driver" ? vehicle : undefined,
    });

    const payload = { id: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = await generateRefreshToken(payload);

    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        vehicle: user.vehicle,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc   Login
// @route  POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const payload = { id: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = await generateRefreshToken(payload);

    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    res.json({
      success: true,
      message: "Login successful",
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        vehicle: user.vehicle,
        isAvailable: user.isAvailable,
        rating: user.rating,
        totalRides: user.totalRides,
        totalEarnings: user.totalEarnings,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc   Refresh access token
// @route  POST /api/auth/refresh
const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: "No refresh token provided" });
    }

    const { newAccessToken, newRefreshToken } = await rotateRefreshToken(token);
    res.cookie("refreshToken", newRefreshToken, COOKIE_OPTIONS);

    res.json({ success: true, accessToken: newAccessToken });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message || "Invalid refresh token" });
  }
};

// @desc   Logout
// @route  POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) await revokeRefreshToken(token);
    res.clearCookie("refreshToken");
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

// @desc   Logout from all devices
// @route  POST /api/auth/logout-all
const logoutAll = async (req, res, next) => {
  try {
    await revokeAllUserTokens(req.user._id);
    res.clearCookie("refreshToken");
    res.json({ success: true, message: "Logged out from all devices" });
  } catch (err) {
    next(err);
  }
};

// @desc   Get current user profile
// @route  GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

module.exports = { register, login, refresh, logout, logoutAll, getMe };
