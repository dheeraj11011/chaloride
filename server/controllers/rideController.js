const Ride = require("../models/Ride");
const User = require("../models/User");
const estimateFare = require("../utils/fareEstimator");

// @desc   Estimate fare before booking
// @route  POST /api/rides/estimate
const getFareEstimate = async (req, res, next) => {
  try {
    const { pickup, destination, vehicleType } = req.body;

    if (!pickup?.lat || !pickup?.lng || !destination?.lat || !destination?.lng) {
      return res.status(400).json({ success: false, message: "Pickup and destination coordinates required" });
    }

    // Count available drivers for surge calculation
    const availableDrivers = await User.countDocuments({
      role: "driver",
      isAvailable: true,
    });

    const estimate = estimateFare(pickup, destination, vehicleType || "mini", availableDrivers);

    res.json({ success: true, estimate });
  } catch (err) {
    next(err);
  }
};

// @desc   Book a ride
// @route  POST /api/rides/book
const bookRide = async (req, res, next) => {
  try {
    const { pickup, destination, vehicleType } = req.body;

    if (!pickup || !destination) {
      return res.status(400).json({ success: false, message: "Pickup and destination required" });
    }

    // Check if passenger already has an active ride
    const activeRide = await Ride.findOne({
      passenger: req.user._id,
      status: { $in: ["requested", "accepted", "in_progress"] },
    });

    if (activeRide) {
      return res.status(400).json({ success: false, message: "You already have an active ride" });
    }

    const availableDrivers = await User.countDocuments({ role: "driver", isAvailable: true });
    const { distanceKm, estimatedFare } = estimateFare(pickup, destination, vehicleType, availableDrivers);

    const ride = await Ride.create({
      passenger: req.user._id,
      pickup,
      destination,
      distanceKm,
      fare: estimatedFare,
      vehicleType: vehicleType || "mini",
    });

    const populatedRide = await ride.populate("passenger", "name email phone");

    // Emit to all available drivers via socket (handled in socketHandler)
    const io = req.app.get("io");
    if (io) {
      io.to("drivers").emit("new_ride_request", {
        rideId: ride._id,
        pickup: ride.pickup,
        destination: ride.destination,
        fare: ride.fare,
        distanceKm: ride.distanceKm,
        vehicleType: ride.vehicleType,
        passenger: {
          name: req.user.name,
          phone: req.user.phone,
        },
      });
    }

    res.status(201).json({ success: true, ride: populatedRide });
  } catch (err) {
    next(err);
  }
};

// @desc   Get a specific ride
// @route  GET /api/rides/:id
const getRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate("passenger", "name email phone rating")
      .populate("driver", "name phone vehicle rating currentLocation");

    if (!ride) return res.status(404).json({ success: false, message: "Ride not found" });

    // Only the passenger or driver of this ride can view it
    const isPassenger = ride.passenger?._id.toString() === req.user._id.toString();
    const isDriver = ride.driver?._id?.toString() === req.user._id.toString();

    if (!isPassenger && !isDriver) {
      return res.status(403).json({ success: false, message: "Not authorized to view this ride" });
    }

    res.json({ success: true, ride });
  } catch (err) {
    next(err);
  }
};

// @desc   Get my rides (history)
// @route  GET /api/rides/my
const getMyRides = async (req, res, next) => {
  try {
    const query =
      req.user.role === "passenger"
        ? { passenger: req.user._id }
        : { driver: req.user._id };

    const rides = await Ride.find(query)
      .populate("passenger", "name phone")
      .populate("driver", "name phone vehicle")
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, rides });
  } catch (err) {
    next(err);
  }
};

// @desc   Get current active ride
// @route  GET /api/rides/active
const getActiveRide = async (req, res, next) => {
  try {
    const query =
      req.user.role === "passenger"
        ? { passenger: req.user._id, status: { $in: ["requested", "accepted", "in_progress"] } }
        : { driver: req.user._id, status: { $in: ["accepted", "in_progress"] } };

    const ride = await Ride.findOne(query)
      .populate("passenger", "name email phone")
      .populate("driver", "name phone vehicle rating currentLocation");

    res.json({ success: true, ride: ride || null });
  } catch (err) {
    next(err);
  }
};

// @desc   Cancel a ride
// @route  PATCH /api/rides/:id/cancel
const cancelRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false, message: "Ride not found" });

    if (!["requested", "accepted"].includes(ride.status)) {
      return res.status(400).json({ success: false, message: "Ride cannot be cancelled at this stage" });
    }

    const isPassenger = ride.passenger.toString() === req.user._id.toString();
    const isDriver = ride.driver?.toString() === req.user._id.toString();

    if (!isPassenger && !isDriver) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    ride.status = "cancelled";
    ride.cancelledBy = isPassenger ? "passenger" : "driver";
    await ride.save();

    // If driver cancels, make them available again
    if (isDriver) {
      await User.findByIdAndUpdate(req.user._id, { isAvailable: true });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`ride_${ride._id}`).emit("ride_cancelled", { rideId: ride._id, cancelledBy: ride.cancelledBy });
    }

    res.json({ success: true, message: "Ride cancelled", ride });
  } catch (err) {
    next(err);
  }
};

// @desc   Rate a completed ride
// @route  PATCH /api/rides/:id/rate
const rateRide = async (req, res, next) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false, message: "Ride not found" });
    if (ride.status !== "completed") return res.status(400).json({ success: false, message: "Can only rate completed rides" });
    if (ride.passenger.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only passenger can rate this ride" });
    }
    if (ride.rating) return res.status(400).json({ success: false, message: "Ride already rated" });

    ride.rating = rating;
    await ride.save();

    // Update driver's average rating
    if (ride.driver) {
      const driverRides = await Ride.find({ driver: ride.driver, rating: { $ne: null } });
      const avgRating = driverRides.reduce((a, r) => a + r.rating, 0) / driverRides.length;
      await User.findByIdAndUpdate(ride.driver, { rating: parseFloat(avgRating.toFixed(1)) });
    }

    res.json({ success: true, message: "Rating submitted" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getFareEstimate, bookRide, getRide, getMyRides, getActiveRide, cancelRide, rateRide };
