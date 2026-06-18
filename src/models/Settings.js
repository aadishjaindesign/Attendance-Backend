const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
{
  companyName: String,
  officeAddress: String,

  latitude: Number,
  longitude: Number,

  allowedRadius: {
    type: Number,
    default: 100,
  },
},
{ timestamps: true }
);

module.exports = mongoose.model(
  "Settings",
  settingsSchema
);