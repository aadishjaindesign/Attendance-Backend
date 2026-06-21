const Settings = require("../models/Settings");

const saveSettings = async (req, res) => {
  try {
    const existing = await Settings.findOne();
    if (existing) {
      const updated = await Settings.findByIdAndUpdate(existing._id, req.body, { new: true });
      return res.json(updated);
    }
    const settings = await Settings.create(req.body);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { saveSettings, getSettings };