const express = require("express");
const router = express.Router();

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
} = require("../controllers/adminController");

// Dashboard
router.get("/dashboard", getDashboardStats);

// Employees
router.get("/employees", getAllEmployees);
router.get("/employees/removed", getRemovedEmployees);

// Attendance
router.get("/attendance", getAllAttendance);

// Reports
router.get("/employee-report", getEmployeeDetailReport);

// Approvals
router.get("/pending", getPendingEmployees);
router.put("/approve/:id", approveEmployee);
router.delete("/reject/:id", rejectEmployee);

// Employee remove
router.put("/remove/:id", removeEmployee);

// Grant extra leave
router.post("/grant-leave", grantExtraLeave);

module.exports = router;