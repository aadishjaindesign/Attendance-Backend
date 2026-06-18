const Leave = require("../models/Leave");

const applyLeave = async (req, res) => {
  try {
    const {
      employee,
      leaveType,
      fromDate,
      toDate,
      reason,
    } = req.body;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyLeaves = await Leave.countDocuments({
      employee,
      createdAt: {
        $gte: new Date(currentYear, currentMonth, 1),
        $lt: new Date(currentYear, currentMonth + 1, 1),
      },
    });

    if (monthlyLeaves >= 2) {
      return res.status(400).json({
        message: "Monthly leave limit reached (2)",
      });
    }

    const leave = await Leave.create({
      employee,
      leaveType,
      fromDate,
      toDate,
      reason,
    });

    res.status(201).json(leave);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({
      employee: req.params.id,
    }).sort({ createdAt: -1 });

    res.json(leaves);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getAllLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find()
      .populate(
        "employee",
        "name email department employeeId"
      )
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const approveLeave = async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      {
        status: "Approved",
      },
      { new: true }
    );

    res.json(leave);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const rejectLeave = async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      {
        status: "Rejected",
      },
      { new: true }
    );

    res.json(leave);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  approveLeave,
  rejectLeave,
};