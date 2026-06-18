const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getPendingEmployees,
  approveEmployee,
  getAllEmployees,
  rejectEmployee,
  getAllAttendance,
  getAttendanceReports,
  getEmployeeDetailReport,
} = require("../controllers/adminController");

// Dashboard stats
router.get("/dashboard", getDashboardStats);

// Pending employees list
router.get("/pending", getPendingEmployees);

router.get("/employees", getAllEmployees);

router.get("/attendance", getAllAttendance);

router.get("/reports", getAttendanceReports);

router.get("/employee-report", getEmployeeDetailReport);

// Approve employee
router.put("/approve/:id", approveEmployee);

// Reject employee
router.delete("/reject/:id", rejectEmployee);

module.exports = router;