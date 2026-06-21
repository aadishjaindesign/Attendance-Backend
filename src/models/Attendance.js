const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: String, // "YYYY-MM-DD" format — easy same-day check ke liye
      required: true,
    },

    checkIn: Date,
    checkOut: Date,

   status: {
  type: String,
  enum: [
    "Present",
    "Half Day",
    "Absent",
    "Sunday",
    "Holiday",
    "Leave"
  ],
  default: "Present",
},

    note: String, // Sunday/Holiday ke liye
  },
  { timestamps: true }
);

// Ek employee ka ek din me sirf ek record
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);