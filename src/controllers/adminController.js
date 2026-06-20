const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");

// DASHBOARD STATS
const getDashboardStats = async (req, res) => {
  try {
    const totalEmployees = await User.countDocuments({
      role: "employee",
      status: "approved",
    });

    const pendingApprovals = await User.countDocuments({
      role: "employee",
      status: "pending",
    });

    // Today's attendance
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const presentToday = await Attendance.countDocuments({
      createdAt: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    });

    const absentToday =
      totalEmployees - presentToday;

    const recentUsers = await User.find({
      role: "employee",
    })
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalEmployees,
      pendingApprovals,
      presentToday,
      absentToday,
      recentUsers,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// GET PENDING EMPLOYEES
const getPendingEmployees = async (req, res) => {
  try {
    const users = await User.find({
      role: "employee",
      status: "pending",
    }).select("-password");

    res.json(users);


  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// APPROVE EMPLOYEE
const approveEmployee = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    ).select("-password");


    if (!user) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    res.json({
      message: "Employee Approved Successfully",
      user,
    });


  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// REJECT EMPLOYEE
const rejectEmployee = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(
      req.params.id
    );


    if (!user) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    res.json({
      message: "Employee Rejected Successfully",
    });


  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


const getAllEmployees = async (req, res) => {
  try {
    const employees = await User.find({
      role: "employee",
    })
      .select("-password")
      .sort({ createdAt: -1 });


    res.json(employees);


  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


const getAllAttendance = async (req, res) => {
  try {
    const records = await Attendance.find()
      .populate(
        "employee",
        "name email department"
      )
      .sort({ createdAt: -1 });


    res.json(records);


  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
const getAttendanceReports = async (req, res) => {
  try {

    const employees = await User.find({
      role: "employee",
      status: "approved",
    });

    const reports = [];

    for (const emp of employees) {

      const attendance = await Attendance.find({
        employee: emp._id,
      });

      const leaves = await Leave.find({
        employee: emp._id,
        status: "Approved",
      });

      let totalHours = 0;

      attendance.forEach((record) => {

        if (record.checkIn && record.checkOut) {

          const hours =
            (new Date(record.checkOut) -
              new Date(record.checkIn))
            / (1000 * 60 * 60);

          totalHours += hours;
        }
      });

      reports.push({
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        present: attendance.length,
        absent: 0,
        leaves: leaves.length,
        hours: totalHours.toFixed(1),
      });
    }

    res.json(reports);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
};
// EMPLOYEE DETAIL REPORT — with date filter
const getEmployeeDetailReport = async (req, res) => {
  try {
    const { employeeId, filter, startDate, endDate } = req.query;

    // Date range calculate karo
    let start, end;
    const now = new Date();

    if (filter === "weekly") {
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      end = now;
    } else if (filter === "monthly") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (filter === "custom" && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default — is mahine
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
    }

    // Employee fetch karo
    const query = { role: "employee", status: "approved" };
    if (employeeId) query._id = employeeId;

    const employees = await User.find(query).select("-password");

    const reports = [];

    for (const emp of employees) {

      // Attendance records in date range
      const attendance = await Attendance.find({
        employee: emp._id,
        createdAt: { $gte: start, $lte: end },
      }).sort({ createdAt: -1 });

      // Leaves in date range
      const leaves = await Leave.find({
        employee: emp._id,
        createdAt: { $gte: start, $lte: end },
      }).sort({ createdAt: -1 });

      // Total hours calculate karo
      let totalHours = 0;
      attendance.forEach((record) => {
        if (record.checkIn && record.checkOut) {
          totalHours +=
            (new Date(record.checkOut) - new Date(record.checkIn))
            / (1000 * 60 * 60);
        }
      });

      reports.push({
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department || "-",
        totalDays: attendance.length,
        totalHours: totalHours.toFixed(1),
        attendance: attendance.map((a) => ({
          date: a.createdAt,
          checkIn: a.checkIn,
          checkOut: a.checkOut,
          status: a.status,
          hours:
            a.checkIn && a.checkOut
              ? (
                  (new Date(a.checkOut) - new Date(a.checkIn))
                  / (1000 * 60 * 60)
                ).toFixed(1)
              : 0,
        })),
        leaves: leaves.map((l) => ({
          leaveType: l.leaveType,
          fromDate: l.fromDate,
          toDate: l.toDate,
          reason: l.reason,
          status: l.status,
        })),
        leavesCount: leaves.length,
      });
    }

    res.json(reports);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getPendingEmployees,
  approveEmployee,
  rejectEmployee,
  getAllEmployees,
  getAllAttendance,
  getAttendanceReports,
  getEmployeeDetailReport, 
};



