const User = require("../models/User");
const Ride = require("../models/Ride");

// @desc   Toggle driver availability
// @route  PATCH /api/driver/availability
const toggleAvailability = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.isAvailable = !user.isAvailable;

    // Clear location if going offline
    if (!user.isAvailable) user.currentLocation = null;

    await user.save();

    const io = req.app.get("io");
    if (io) {
      if (user.isAvailable) {
        io.to("drivers").emit("driver_online", { driverId: user._id });
      } else {
        io.to("drivers").emit("driver_offline", { driverId: user._id });
      }
    }

    res.json({
      success: true,
      isAvailable: user.isAvailable,
      message: `You are now ${user.isAvailable ? "online" : "offline"}`,
    });
  } catch (err) {
    next(err);
  }
};

// @desc   Update driver location
// @route  PATCH /api/driver/location
const updateLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: "lat and lng required" });
    }

    await User.findByIdAndUpdate(req.user._id, {
      currentLocation: { lat, lng },
    });

    // Broadcast to any passengers tracking this driver
    const io = req.app.get("io");
    if (io) {
      io.emit(`driver_location_${req.user._id}`, { driverId: req.user._id, lat, lng });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// @desc   Accept a ride request
// @route  PATCH /api/driver/rides/:rideId/accept
const acceptRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return res.status(404).json({ success: false, message: "Ride not found" });
    if (ride.status !== "requested") {
      return res.status(400).json({ success: false, message: "Ride is no longer available" });
    }

    // Check if driver already has an active ride
    const existingRide = await Ride.findOne({
      driver: req.user._id,
      status: { $in: ["accepted", "in_progress"] },
    });
    if (existingRide) {
      return res.status(400).json({ success: false, message: "You already have an active ride" });
    }

    ride.driver = req.user._id;
    ride.status = "accepted";
    await ride.save();

    // Mark driver as unavailable
    await User.findByIdAndUpdate(req.user._id, { isAvailable: false });

    const populatedRide = await ride
      .populate("passenger", "name phone email")
      .then((r) => r.populate("driver", "name phone vehicle rating currentLocation"));

    const io = req.app.get("io");
    if (io) {
      // Notify the passenger
      io.to(`user_${ride.passenger}`).emit("ride_accepted", {
        rideId: ride._id,
        driver: {
          id: req.user._id,
          name: req.user.name,
          phone: req.user.phone,
          vehicle: req.user.vehicle,
          rating: req.user.rating,
        },
      });
      // Tell all other drivers it's taken
      io.to("drivers").emit("ride_taken", { rideId: ride._id });
    }

    res.json({ success: true, ride: populatedRide });
  } catch (err) {
    next(err);
  }
};

// @desc   Start a ride (driver arrived at pickup)
// @route  PATCH /api/driver/rides/:rideId/start
const startRide = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.rideId, driver: req.user._id });
    if (!ride) return res.status(404).json({ success: false, message: "Ride not found" });
    if (ride.status !== "accepted") {
      return res.status(400).json({ success: false, message: "Ride must be accepted before starting" });
    }

    ride.status = "in_progress";
    ride.startedAt = new Date();
    await ride.save();

    const io = req.app.get("io");
    if (io) {
      io.to(`user_${ride.passenger}`).emit("ride_started", { rideId: ride._id });
    }

    res.json({ success: true, ride });
  } catch (err) {
    next(err);
  }
};

// @desc   Complete a ride
// @route  PATCH /api/driver/rides/:rideId/complete
const completeRide = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.rideId, driver: req.user._id });
    if (!ride) return res.status(404).json({ success: false, message: "Ride not found" });
    if (ride.status !== "in_progress") {
      return res.status(400).json({ success: false, message: "Ride is not in progress" });
    }

    ride.status = "completed";
    ride.completedAt = new Date();
    await ride.save();

    // Update driver stats and make them available again
    await User.findByIdAndUpdate(req.user._id, {
      isAvailable: true,
      $inc: { totalRides: 1, totalEarnings: ride.fare },
    });

    // Update passenger ride count
    await User.findByIdAndUpdate(ride.passenger, { $inc: { totalRides: 1 } });

    const io = req.app.get("io");
    if (io) {
      io.to(`user_${ride.passenger}`).emit("ride_completed", {
        rideId: ride._id,
        fare: ride.fare,
      });
    }

    res.json({ success: true, message: "Ride completed!", ride });
  } catch (err) {
    next(err);
  }
};

// @desc   Get nearby pending rides for driver
// @route  GET /api/driver/nearby-rides
const getNearbyRides = async (req, res, next) => {
  try {
    const rides = await Ride.find({ status: "requested" })
      .populate("passenger", "name phone rating")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ success: true, rides });
  } catch (err) {
    next(err);
  }
};

// @desc   Get driver stats
// @route  GET /api/driver/stats
const getDriverStats = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayRides = await Ride.countDocuments({
      driver: req.user._id,
      status: "completed",
      completedAt: { $gte: todayStart },
    });

    const todayEarnings = await Ride.aggregate([
      {
        $match: {
          driver: req.user._id,
          status: "completed",
          completedAt: { $gte: todayStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$fare" } } },
    ]);

    res.json({
      success: true,
      stats: {
        totalRides: user.totalRides,
        totalEarnings: user.totalEarnings,
        rating: user.rating,
        todayRides,
        todayEarnings: todayEarnings[0]?.total || 0,
        isAvailable: user.isAvailable,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  toggleAvailability,
  updateLocation,
  acceptRide,
  startRide,
  completeRide,
  getNearbyRides,
  getDriverStats,
};
