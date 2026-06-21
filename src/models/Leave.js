const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    leaveType: String,
    fromDate: Date,
    toDate: Date,
    reason: String,

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    // Rejection ke waqt admin reason de sake
    rejectionReason: {
      type: String,
      default: "",
    },

    // Admin ne manually di hui leave hai ya employee ne apply ki
    isAdminGranted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Leave", leaveSchema);