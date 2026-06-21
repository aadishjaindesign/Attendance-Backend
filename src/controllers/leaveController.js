const Leave = require("../models/Leave");
const User = require("../models/User");

// ── APPLY LEAVE ──
const applyLeave = async (req, res) => {
  try {
    const { employee, leaveType, fromDate, toDate, reason } = req.body;

    const user = await User.findById(employee);
    if (!user) return res.status(404).json({ message: "Employee not found" });

    // Monthly leave limit: 2 (+ extra leaves admin ne di hain)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyLeaves = await Leave.countDocuments({
      employee,
      status: { $in: ["Approved", "Pending"] },
      createdAt: {
        $gte: new Date(currentYear, currentMonth, 1),
        $lt: new Date(currentYear, currentMonth + 1, 1),
      },
    });

    const totalAllowed = 2 + (user.extraLeaves || 0);

    if (monthlyLeaves >= totalAllowed) {
      return res.status(400).json({
        message: `Monthly leave limit reached (${totalAllowed})`,
      });
    }

    const leave = await Leave.create({ employee, leaveType, fromDate, toDate, reason });
    res.status(201).json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET MY LEAVES ──
const getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ employee: req.params.id }).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET ALL LEAVES (admin) ──
const getAllLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find()
      .populate("employee", "name email department employeeId")
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── APPROVE LEAVE ──
const approveLeave = async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status: "Approved" },
      { new: true }
    ).populate("employee", "name email department employeeId");

    if (!leave) return res.status(404).json({ message: "Leave not found" });
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── REJECT LEAVE (with reason) ──
const rejectLeave = async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      {
        status: "Rejected",
        rejectionReason: rejectionReason || "No reason provided",
      },
      { new: true }
    ).populate("employee", "name email department employeeId");

    if (!leave) return res.status(404).json({ message: "Leave not found" });
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── ADMIN GRANT EXTRA LEAVE TO EMPLOYEE ──
const grantExtraLeave = async (req, res) => {
  try {
    const { employeeId, extraLeaves, reason, fromDate, toDate } = req.body;

    const user = await User.findById(employeeId);
    if (!user) return res.status(404).json({ message: "Employee not found" });

    // Extra leave count badhao
    user.extraLeaves = (user.extraLeaves || 0) + extraLeaves;
    await user.save();

    // Leave record bhi banao
    const leave = await Leave.create({
      employee: employeeId,
      leaveType: "Admin Granted",
      fromDate: fromDate || new Date(),
      toDate: toDate || new Date(),
      reason: reason || "Admin granted extra leave",
      status: "Approved",
      isAdminGranted: true,
    });

    res.json({ message: `${extraLeaves} extra leave(s) granted`, user, leave });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  approveLeave,
  rejectLeave,
  grantExtraLeave,
};