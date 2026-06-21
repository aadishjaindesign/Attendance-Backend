const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    description: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Holiday", holidaySchema);