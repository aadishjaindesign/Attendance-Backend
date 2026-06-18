const express = require("express");
const router = express.Router();

const {
  checkIn,
  checkOut,
  getMyAttendance,
} = require("../controllers/attendanceController");

router.post("/checkin", checkIn);
router.post("/checkout", checkOut);
router.get("/:id", getMyAttendance);

module.exports = router;