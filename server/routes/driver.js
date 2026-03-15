const express = require("express");
const router = express.Router();
const {
  toggleAvailability,
  updateLocation,
  acceptRide,
  startRide,
  completeRide,
  getNearbyRides,
  getDriverStats,
} = require("../controllers/driverController");
const { protect, authorize } = require("../middleware/auth");

router.use(protect, authorize("driver")); // All driver routes require driver role

router.patch("/availability",         toggleAvailability);
router.patch("/location",             updateLocation);
router.get("/nearby-rides",           getNearbyRides);
router.get("/stats",                  getDriverStats);
router.patch("/rides/:rideId/accept", acceptRide);
router.patch("/rides/:rideId/start",  startRide);
router.patch("/rides/:rideId/complete", completeRide);

module.exports = router;
