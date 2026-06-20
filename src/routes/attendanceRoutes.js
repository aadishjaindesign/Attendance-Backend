const express = require("express");
const router = express.Router();

const {
  checkIn,
  checkOut,
  getMyAttendance,
  getTodayAttendance,
} = require("../controllers/attendanceController");

router.post("/checkin", checkIn);
router.post("/checkout", checkOut);

router.get("/today/:id", getTodayAttendance);
router.get("/:id", getMyAttendance);

module.exports = router;