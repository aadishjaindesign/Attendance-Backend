const express = require("express");
const router  = express.Router();

const {
  getDashboardStats,
  getPendingEmployees,
  approveEmployee,
  getAllEmployees,
  getRemovedEmployees,
  rejectEmployee,
  removeEmployee,
  getAllAttendance,
  getEmployeeDetailReport,
  grantExtraLeave,
  getTodayAttendance,
  getEmployeeById,
  fixOldCheckouts,   // ← ye add kiya

  // Holiday Controllers
  getHolidays,
  addHoliday,
  deleteHoliday,
} = require("../controllers/adminController");

// Dashboard
router.get("/dashboard",          getDashboardStats);

// Employees
router.get("/employees",          getAllEmployees);
router.get("/employees/removed",  getRemovedEmployees);
router.get("/employees/:id",      getEmployeeById);

// Attendance
router.get("/attendance",         getAllAttendance);
router.get("/today-attendance",   getTodayAttendance);

// Reports
router.get("/employee-report",    getEmployeeDetailReport);

// Approvals
router.get("/pending",            getPendingEmployees);
router.put("/approve/:id",        approveEmployee);
router.delete("/reject/:id",      rejectEmployee);

// Employee remove
router.put("/remove/:id",         removeEmployee);

// Grant extra leave
router.post("/grant-leave",       grantExtraLeave);

// Holiday Routes
router.get("/holidays",           getHolidays);
router.post("/holidays",          addHoliday);
router.delete("/holidays/:id",    deleteHoliday);

// One-time fix for old records
router.post("/fix-old-checkouts", fixOldCheckouts);

module.exports = router;