const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const Holiday = require("../models/Holiday");
const { autoMarkHoliday } = require("./attendanceController");

// ── IST Date helper ──
const getISTDateString = () => {
  const istDate = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
  return istDate.toISOString().slice(0, 10);
};

// ── DASHBOARD STATS ──
const getDashboardStats = async (req, res) => {
  try {
    const totalEmployees = await User.countDocuments({ role: "employee", status: "approved" });
    const pendingApprovals = await User.countDocuments({ role: "employee", status: "pending" });

    // FIX: IST date use karo — Render UTC pe hai
    const todayStr = getISTDateString();
    const presentToday = await Attendance.countDocuments({
      date: todayStr,
      status: "Present",
    });

    const absentToday = Math.max(0, totalEmployees - presentToday);

    const recentUsers = await User.find({ role: "employee" })
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({ totalEmployees, pendingApprovals, presentToday, absentToday, recentUsers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── PENDING EMPLOYEES ──
const getPendingEmployees = async (req, res) => {
  try {
    const users = await User.find({ role: "employee", status: "pending" }).select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── ALL EMPLOYEES (approved only) ──
const getAllEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: "employee", status: "approved" })
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── REMOVED EMPLOYEES ──
const getRemovedEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: "employee", status: "removed" })
      .select("-password")
      .sort({ updatedAt: -1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── APPROVE EMPLOYEE ──
const approveEmployee = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "Employee not found" });
    res.json({ message: "Employee approved successfully", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── REJECT (pending se delete) ──
const rejectEmployee = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "Employee not found" });
    res.json({ message: "Employee rejected and removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── REMOVE APPROVED EMPLOYEE (status = removed, data rakhte hain) ──
const removeEmployee = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: "removed" },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "Employee not found" });
    res.json({ message: "Employee removed. They cannot login anymore.", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── ALL ATTENDANCE (employees only — admin rows nahi) ──
const getAllAttendance = async (req, res) => {
  try {
    // FIX: Sirf employee role wale records lo, admin exclude
    const employeeIds = await User.find({ role: "employee" }).select("_id");
    const ids = employeeIds.map((u) => u._id);

    const records = await Attendance.find({ employee: { $in: ids } })
      .populate("employee", "name email department role")
      .sort({ date: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── EMPLOYEE DETAIL REPORT ──
const getEmployeeDetailReport = async (req, res) => {
  try {
    const { employeeId, filter, startDate, endDate } = req.query;

    let startStr, endStr;
    const now = new Date();

    if (filter === "weekly") {
      const s = new Date(now);
      s.setDate(now.getDate() - 7);
      startStr = s.toISOString().slice(0, 10);
      endStr = now.toISOString().slice(0, 10);
    } else if (filter === "monthly") {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      startStr = s.toISOString().slice(0, 10);
      endStr = e.toISOString().slice(0, 10);
    } else if (filter === "custom" && startDate && endDate) {
      startStr = startDate;
      endStr = endDate;
    } else {
      // Default: is mahine
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      startStr = s.toISOString().slice(0, 10);
      endStr = now.toISOString().slice(0, 10);
    }

    const query = { role: "employee", status: "approved" };
    if (employeeId) query._id = employeeId;

    const employees = await User.find(query).select("-password");
    const reports = [];

    for (const emp of employees) {
      // FIX: date string se filter karo (date field "YYYY-MM-DD" hai)
      const attendance = await Attendance.find({
        employee: emp._id,
        date: { $gte: startStr, $lte: endStr },
      }).sort({ date: -1 });

      const leaves = await Leave.find({
        employee: emp._id,
        createdAt: {
          $gte: new Date(startStr),
          $lte: new Date(endStr + "T23:59:59.999Z"),
        },
      }).sort({ createdAt: -1 });

      let totalHours = 0;
      attendance.forEach((a) => {
        if (a.checkIn && a.checkOut) {
          totalHours += (new Date(a.checkOut) - new Date(a.checkIn)) / (1000 * 60 * 60);
        }
      });

      reports.push({
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department || "-",
        totalDays: attendance.filter((a) => a.status === "Present").length,
        halfDays: attendance.filter((a) => a.status === "Half Day").length,
        totalHours: totalHours.toFixed(1),
        attendance: attendance.map((a) => ({
          date: a.date,
          checkIn: a.checkIn,
          checkOut: a.checkOut,
          status: a.status,
          hours:
            a.checkIn && a.checkOut
              ? ((new Date(a.checkOut) - new Date(a.checkIn)) / (1000 * 60 * 60)).toFixed(1)
              : 0,
        })),
        leaves: leaves.map((l) => ({
          leaveType: l.leaveType,
          fromDate: l.fromDate,
          toDate: l.toDate,
          reason: l.reason,
          status: l.status,
          rejectionReason: l.rejectionReason,
          isAdminGranted: l.isAdminGranted,
        })),
        leavesCount: leaves.length,
      });
    }

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET HOLIDAYS ──
const getHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ fromDate: -1 });
    res.json(holidays);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── ADD HOLIDAY ──
const addHoliday = async (req, res) => {
  try {
    const { title, fromDate, toDate, description } = req.body;
    const holiday = await Holiday.create({ title, fromDate, toDate, description });

    // Auto mark attendance for all employees
    await autoMarkHoliday(holiday._id);

    res.status(201).json({ message: "Holiday added and attendance auto-marked", holiday });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── DELETE HOLIDAY ──
const deleteHoliday = async (req, res) => {
  try {
    await Holiday.findByIdAndDelete(req.params.id);
    res.json({ message: "Holiday deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GRANT EXTRA LEAVE ──
const grantExtraLeave = async (req, res) => {
  try {
    const { employeeId, extraLeaves, reason, fromDate, toDate } = req.body;

    const user = await User.findById(employeeId);
    if (!user) return res.status(404).json({ message: "Employee not found" });

    user.extraLeaves = (user.extraLeaves || 0) + Number(extraLeaves);
    await user.save();

    const leave = await Leave.create({
      employee: employeeId,
      leaveType: "Admin Granted",
      fromDate: fromDate || new Date(),
      toDate: toDate || new Date(),
      reason: reason || "Admin granted extra leave",
      status: "Approved",
      isAdminGranted: true,
    });

    res.json({ message: `${extraLeaves} extra leave(s) granted successfully`, user, leave });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET EMPLOYEE DETAIL (for modal) ──
const getEmployeeById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "Employee not found" });

    const leaves = await Leave.find({ employee: user._id }).sort({ createdAt: -1 });

    res.json({ ...user.toObject(), leaves });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getTodayAttendance = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);

    const records = await Attendance.find({
      date: todayStr,
    }).populate("employee", "name department");

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getPendingEmployees,
  getAllEmployees,
  getRemovedEmployees,
  approveEmployee,
  rejectEmployee,
  removeEmployee,
  getAllAttendance,
  getEmployeeDetailReport,
  getHolidays,
  addHoliday,
  deleteHoliday,
  grantExtraLeave,
  getEmployeeById,
  getTodayAttendance,
   fixOldCheckouts, 
};