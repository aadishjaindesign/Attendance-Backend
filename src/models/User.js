const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,

    role: {
      type: String,
      enum: ["admin", "employee"],
      default: "employee",
    },

    phone: String,
    employeeId: String,
    department: String,
    designation: String,

    status: {
      type: String,
      enum: ["pending", "approved", "removed"],
      default: "pending",
    },

    // Admin द्वारा extra leaves
    extraLeaves: {
      type: Number,
      default: 0,
    },

    // Password reset token
    resetToken: String,
    resetTokenExpiry: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);