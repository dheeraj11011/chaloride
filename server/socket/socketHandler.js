const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Map of userId -> socketId for targeted emissions
const connectedUsers = new Map();
const connectedDrivers = new Map();

const socketHandler = (io) => {
  // Middleware: authenticate socket connections via token
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) return next(new Error("Authentication error"));

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (!user) return next(new Error("User not found"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user;
    console.log(`🔌 ${user.role} connected: ${user.name} (${socket.id})`);

    // Store connection
    connectedUsers.set(user._id.toString(), socket.id);

    // Join personal room for targeted events
    socket.join(`user_${user._id}`);

    // Drivers join the drivers room to receive ride requests
    if (user.role === "driver") {
      socket.join("drivers");
      connectedDrivers.set(user._id.toString(), socket.id);
    }

    // ─── Driver: broadcast live location ──────────────────────────────
    socket.on("driver:update_location", async ({ lat, lng }) => {
      if (user.role !== "driver") return;

      try {
        await User.findByIdAndUpdate(user._id, { currentLocation: { lat, lng } });

        // Broadcast to passengers tracking this specific driver (targeted room)
        io.to(`tracking_${user._id}`).emit(`driver_location_${user._id}`, {
          driverId: user._id,
          lat,
          lng,
        });
      } catch (err) {
        console.error("Location update error:", err.message);
      }
    });

    // ─── Passenger: subscribe to a driver's location ──────────────────
    socket.on("passenger:track_driver", ({ driverId }) => {
      socket.join(`tracking_${driverId}`);
    });

    socket.on("passenger:untrack_driver", ({ driverId }) => {
      socket.leave(`tracking_${driverId}`);
    });

    // ─── Join a specific ride room ─────────────────────────────────────
    socket.on("join_ride_room", ({ rideId }) => {
      socket.join(`ride_${rideId}`);
    });

    socket.on("leave_ride_room", ({ rideId }) => {
      socket.leave(`ride_${rideId}`);
    });

    // ─── Chat within a ride ────────────────────────────────────────────
    socket.on("ride:message", ({ rideId, message }) => {
      io.to(`ride_${rideId}`).emit("ride:message", {
        from: { id: user._id, name: user.name, role: user.role },
        message,
        timestamp: new Date().toISOString(),
      });
    });

    // ─── Disconnect ────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`🔌 ${user.role} disconnected: ${user.name}`);
      connectedUsers.delete(user._id.toString());

      if (user.role === "driver") {
        connectedDrivers.delete(user._id.toString());
        // Mark driver offline if they disconnect
        await User.findByIdAndUpdate(user._id, {
          isAvailable: false,
          currentLocation: null,
        }).catch(() => {});
      }
    });
  });
};

module.exports = socketHandler;
