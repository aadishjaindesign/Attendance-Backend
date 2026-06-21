const express = require("express");
const { saveSettings, getSettings } = require("../controllers/settingsController");
const router = express.Router();

router.get("/", getSettings);
router.post("/", saveSettings);

module.exports = router;