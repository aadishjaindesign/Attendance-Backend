const express = require("express");
const router = express.Router();
const {
  checkIn,
  checkOut,
  getMyAttendance,
  getTodayAttendance,
  autoMarkSundays,
} = require("../controllers/attendanceController");

router.post("/checkin", checkIn);
router.post("/checkout", checkOut);
router.get("/today/:id", getTodayAttendance);
router.get("/:id", getMyAttendance);
router.post("/auto-sunday", autoMarkSundays);

module.exports = router;