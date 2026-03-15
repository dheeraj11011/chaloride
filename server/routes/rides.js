const express = require("express");
const router = express.Router();
const {
  getFareEstimate,
  bookRide,
  getRide,
  getMyRides,
  getActiveRide,
  cancelRide,
  rateRide,
} = require("../controllers/rideController");
const { protect, authorize } = require("../middleware/auth");

router.use(protect); // All ride routes require auth

router.post("/estimate", getFareEstimate);
router.post("/book",     authorize("passenger"), bookRide);
router.get("/my",        getMyRides);
router.get("/active",    getActiveRide);
router.get("/:id",       getRide);
router.patch("/:id/cancel", cancelRide);
router.patch("/:id/rate",   authorize("passenger"), rateRide);

module.exports = router;
