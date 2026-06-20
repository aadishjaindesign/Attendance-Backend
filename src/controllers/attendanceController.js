const Attendance = require("../models/Attendance");
const Settings = require("../models/Settings");

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ── CHECK IN ──
const checkIn = async (req, res) => {
  try {
    const { employeeId, latitude, longitude } = req.body;

    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(400).json({ message: "Office settings not configured" });
    }

    const distance = calculateDistance(
      latitude, longitude,
      settings.latitude, settings.longitude
    );

    if (distance > settings.allowedRadius) {
      return res.status(400).json({ message: "You are outside office radius" });
    }

    // ✅ Aaj ka din check karo — sirf aaj ka active checkin dekho
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const alreadyCheckedIn = await Attendance.findOne({
      employee: employeeId,
      createdAt: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    });

    if (alreadyCheckedIn) {
      return res.status(400).json
        message: "Attendance already marked for today",
      });
    }

    const attendance = await Attendance.create({
      employee: employeeId,
      checkIn: new Date(),
      status: "Present",
    });

    res.json({ message: "Check In Success", attendance });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── CHECK OUT ──
const checkOut = async (req, res) => {
  try {
    const { employeeId } = req.body;

    // ✅ Aaj ka din check karo
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const attendance = await Attendance.findOneAndUpdate(
      {
        employee: employeeId,
        checkOut: null,
        createdAt: { $gte: todayStart, $lte: todayEnd },
      },
      { checkOut: new Date() },
      { new: true }
    );

    if (!attendance) {
      return res.status(400).json({ message: "No active check-in found for today" });
    }

    res.json({ message: "Check Out Success", attendance });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET EMPLOYEE ATTENDANCE ──
const getMyAttendance = async (req, res) => {
  try {
    const data = await Attendance.find({
      employee: req.params.id,
    }).sort({ createdAt: -1 });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET TODAY ATTENDANCE ONLY ── ✅ naya
const getTodayAttendance = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const data = await Attendance.findOne({
      employee: req.params.id,
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });

    res.json(data || null);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getMyAttendance,
  getTodayAttendance,
};