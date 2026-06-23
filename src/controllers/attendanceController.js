const Attendance = require("../models/Attendance");
const Settings   = require("../models/Settings");
const Holiday    = require("../models/Holiday");
const User       = require("../models/User");

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

// ── IST Date "YYYY-MM-DD" ──
// Render server UTC pe hai, IST = UTC + 5:30
const getISTDateString = () => {
  const istDate = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
  return istDate.toISOString().slice(0, 10);
};

// ── IST Day of Week (0=Sunday ... 6=Saturday) ──
const getISTDayOfWeek = () => {
  const istDate = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
  return istDate.getUTCDay();
};

// ── CHECK IN ──
const checkIn = async (req, res) => {
  try {
    const { employeeId, latitude, longitude } = req.body;

    const user = await User.findById(employeeId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") return res.status(400).json({ message: "Admin attendance not tracked" });
    if (user.status === "removed") return res.status(403).json({ message: "Account removed. Contact admin." });

    const todayStr  = getISTDateString();
    const dayOfWeek = getISTDayOfWeek();

    if (dayOfWeek === 0) {
      return res.status(400).json({ message: "Aaj Sunday hai. Office band hai." });
    }

    const todayDate = new Date(todayStr);
    const holiday   = await Holiday.findOne({ fromDate: { $lte: todayDate }, toDate: { $gte: todayDate } });
    if (holiday) {
      return res.status(400).json({ message: `Aaj holiday hai: ${holiday.title}` });
    }

    const existing = await Attendance.findOne({ employee: employeeId, date: todayStr });
    if (existing) {
      return res.status(400).json({ message: "Aaj ki attendance already mark ho chuki hai" });
    }

    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(400).json({ message: "Admin ne office location configure nahi ki hai" });
    }

    const distance = calculateDistance(
      parseFloat(latitude), parseFloat(longitude),
      parseFloat(settings.latitude), parseFloat(settings.longitude)
    );

    if (distance > settings.allowedRadius) {
      return res.status(400).json({
        message: `Aap office se ${Math.round(distance)}m door hain. Allowed range: ${settings.allowedRadius}m`,
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
    const todayStr = getISTDateString();

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: todayStr,
      checkOut: null,
    });

    if (!attendance) {
      return res.status(400).json({ message: "No active check-in found for today" });
    }

    attendance.checkOut = new Date();
    const hours = (attendance.checkOut - attendance.checkIn) / (1000 * 60 * 60);
    attendance.status = hours < 4 ? "Half Day" : "Present";
    await attendance.save();

    res.json({ message: "Check-out successful", attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET TODAY STATUS ──
const getTodayAttendance = async (req, res) => {
  try {
    const todayStr  = getISTDateString();
    const dayOfWeek = getISTDayOfWeek();

    if (dayOfWeek === 0) {
      return res.json({ isSunday: true, date: todayStr, status: "Sunday", message: "Aaj Sunday hai. Office band hai." });
    }

    const todayDate = new Date(todayStr);
    const holiday   = await Holiday.findOne({ fromDate: { $lte: todayDate }, toDate: { $gte: todayDate } });
    if (holiday) {
      return res.json({ isHoliday: true, date: todayStr, status: "Holiday", message: `Aaj holiday hai: ${holiday.title}` });
    }

    const data = await Attendance.findOne({ employee: req.params.id, date: todayStr });
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

// ── AUTO MARK SUNDAYS ──
// Sunday ke liye 10 AM check-in, 6 PM check-out auto save hoga
const autoMarkSundays = async () => {
  try {
    const dayOfWeek = getISTDayOfWeek();
    if (dayOfWeek !== 0) return;

    const employees = await User.find({ role: "employee", status: "approved" });
    const todayStr  = getISTDateString();

    for (const emp of employees) {
      const exists = await Attendance.findOne({ employee: emp._id, date: todayStr });
      if (!exists) {
        // IST 10:00 AM = UTC 04:30
        const checkInTime = new Date();
        checkInTime.setUTCHours(4, 30, 0, 0);

        // IST 06:00 PM = UTC 12:30
        const checkOutTime = new Date();
        checkOutTime.setUTCHours(12, 30, 0, 0);

        await Attendance.create({
          employee:  emp._id,
          date:      todayStr,
          checkIn:   checkInTime,
          checkOut:  checkOutTime,
          status:    "Sunday",
          note:      "Auto Sunday",
        });
      }
    }
    console.log("✅ Sunday auto-marked");
  } catch (error) {
    console.error("Sunday mark error:", error.message);
  }
};

// ── AUTO MARK HOLIDAY ──
// Holiday ke liye bhi 10 AM - 6 PM auto save hoga
const autoMarkHoliday = async (holidayId) => {
  try {
    const holiday   = await Holiday.findById(holidayId);
    if (!holiday) return;

    const employees = await User.find({ role: "employee", status: "approved" });
    const from      = new Date(holiday.fromDate);
    const to        = new Date(holiday.toDate);

    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const y       = d.getFullYear();
      const m       = String(d.getMonth() + 1).padStart(2, "0");
      const day     = String(d.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${day}`;

      // IST 10:00 AM = UTC 04:30
      const checkInTime = new Date(d);
      checkInTime.setUTCHours(4, 30, 0, 0);

      // IST 06:00 PM = UTC 12:30
      const checkOutTime = new Date(d);
      checkOutTime.setUTCHours(12, 30, 0, 0);

      for (const emp of employees) {
        const exists = await Attendance.findOne({ employee: emp._id, date: dateStr });
        if (!exists) {
          await Attendance.create({
            employee: emp._id,
            date:     dateStr,
            checkIn:  checkInTime,
            checkOut: checkOutTime,
            status:   "Holiday",
            note:     holiday.title,
          });
        }
      }
    }
    console.log(`✅ Holiday auto-marked: ${holiday.title}`);
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
  getISTDateString,
};