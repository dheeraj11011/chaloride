const jwt = require("jsonwebtoken");
const RefreshToken = require("../models/Token");

const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
  });
};

const generateRefreshToken = async (payload) => {
  const token = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Store in DB for rotation tracking
  await RefreshToken.create({
    userId: payload.id,
    token,
    expiresAt,
  });

  return token;
};

const rotateRefreshToken = async (oldToken) => {
  // Verify old token
  const decoded = jwt.verify(oldToken, process.env.REFRESH_TOKEN_SECRET);

  // Check if token exists in DB (not already used/revoked)
  const storedToken = await RefreshToken.findOne({ token: oldToken });
  if (!storedToken) throw new Error("Invalid refresh token — possible reuse detected");

  // Delete old token (rotation)
  await RefreshToken.deleteOne({ token: oldToken });

  // Issue new tokens
  const payload = { id: decoded.id, role: decoded.role };
  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = await generateRefreshToken(payload);

  return { newAccessToken, newRefreshToken };
};

const revokeRefreshToken = async (token) => {
  await RefreshToken.deleteOne({ token });
};

const revokeAllUserTokens = async (userId) => {
  await RefreshToken.deleteMany({ userId });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
};
