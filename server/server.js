require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiter");
const socketHandler = require("./socket/socketHandler");

const authRoutes   = require("./routes/auth");
const rideRoutes   = require("./routes/rides");
const driverRoutes = require("./routes/driver");

const app = express();
const server = http.createServer(app);

// ─── Socket.io ──────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
});

socketHandler(io);
app.set("io", io); // Make io available in controllers via req.app.get("io")

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api", apiLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth",   authRoutes);
app.use("/api/rides",  rideRoutes);
app.use("/api/driver", driverRoutes);

// Health check
app.get("/health", (req, res) =>
  res.json({ status: "OK", timestamp: new Date().toISOString() })
);

// 404 handler
app.use("*", (req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);

// Global error handler
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 ChaloRide server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  });
});
