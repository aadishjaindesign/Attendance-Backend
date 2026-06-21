const Attendance = require("../models/Attendance");
const Settings = require("../models/Settings");
const Holiday = require("../models/Holiday");
const User = require("../models/User");

// ── Distance Calculator ──
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
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── Today's date string "YYYY-MM-DD" ──
const getTodayString = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// ── CHECK IN ──
const checkIn = async (req, res) => {
  try {
    const { employeeId, latitude, longitude } = req.body;

    // Admin ki attendance nahi lagti
    const user = await User.findById(employeeId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") {
      return res.status(400).json({ message: "Admin attendance not tracked" });
    }
    if (user.status === "removed") {
      return res.status(403).json({ message: "Account removed. Contact admin." });
    }

    const todayStr = getTodayString();

    // Sunday check
    const today = new Date();
    if (today.getDay() === 0) {
      return res.status(400).json({ message: "Today is Sunday. Office is closed." });
    }

    // Holiday check
    const todayDate = new Date(todayStr);
    const holiday = await Holiday.findOne({
      fromDate: { $lte: todayDate },
      toDate: { $gte: todayDate },
    });
    if (holiday) {
      return res.status(400).json({
        message: `Today is a holiday: ${holiday.title}`,
      });
    }

    // Already checked in today?
    const existing = await Attendance.findOne({ employee: employeeId, date: todayStr });
    if (existing) {
      return res.status(400).json({ message: "Attendance already marked for today" });
    }

    // Office radius check
    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(400).json({ message: "Office location not configured by admin" });
    }

    const distance = calculateDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      settings.latitude,
      settings.longitude
    );

    if (distance > settings.allowedRadius) {
      return res.status(400).json({
        message: `You are ${Math.round(distance)}m away from office. Allowed: ${settings.allowedRadius}m`,
      });
    }

    const attendance = await Attendance.create({
      employee: employeeId,
      date: todayStr,
      checkIn: new Date(),
      status: "Present",
    });

    res.json({ message: "Check-in successful", attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── CHECK OUT ──
const checkOut = async (req, res) => {
  try {
    const { employeeId } = req.body;

    const todayStr = getTodayString();

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: todayStr,
      checkOut: null,
    });

    if (!attendance) {
      return res.status(400).json({
        message: "No active check-in found for today",
      });
    }

    attendance.checkOut = new Date();

    const hours =
      (attendance.checkOut - attendance.checkIn) /
      (1000 * 60 * 60);

    if (hours < 4) {
      attendance.status = "Half Day";
    } else {
      attendance.status = "Present";
    }

    await attendance.save();

    res.json({
      message: "Check-out successful",
      attendance,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET TODAY STATUS ──
const getTodayAttendance = async (req, res) => {
  try {
    const todayStr = getTodayString();
    const data = await Attendance.findOne({
      employee: req.params.id,
      date: todayStr,
    });
    res.json(data || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET ALL HISTORY ──
const getMyAttendance = async (req, res) => {
  try {
    const data = await Attendance.find({ employee: req.params.id }).sort({ date: -1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── AUTO MARK SUNDAYS (cron/manual trigger) ──
const autoMarkSundays = async (req, res) => {
  try {
    const employees = await User.find({ role: "employee", status: "approved" });
    const today = new Date();

    if (today.getDay() !== 0) {
      return res.json({ message: "Today is not Sunday" });
    }

    const todayStr = getTodayString();
    let count = 0;

    for (const emp of employees) {
      const exists = await Attendance.findOne({ employee: emp._id, date: todayStr });
      if (!exists) {
        await Attendance.create({
          employee: emp._id,
          date: todayStr,
          status: "Sunday",
          note: "Auto-marked Sunday",
        });
        count++;
      }
    }

    res.json({ message: `Sunday marked for ${count} employees` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── AUTO MARK HOLIDAY (jab admin holiday add kare) ──
const autoMarkHoliday = async (holidayId) => {
  try {
    const holiday = await Holiday.findById(holidayId);
    if (!holiday) return;

    const employees = await User.find({ role: "employee", status: "approved" });

    const from = new Date(holiday.fromDate);
    const to = new Date(holiday.toDate);

    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${day}`;

      for (const emp of employees) {
        const exists = await Attendance.findOne({ employee: emp._id, date: dateStr });
        if (!exists) {
          await Attendance.create({
            employee: emp._id,
            date: dateStr,
            status: "Holiday",
            note: holiday.title,
          });
        }
      }
    }
  } catch (error) {
    console.error("Auto Holiday Mark Error:", error.message);
  }
};

module.exports = {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  autoMarkSundays,
  autoMarkHoliday,
};