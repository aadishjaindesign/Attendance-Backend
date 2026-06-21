const express = require("express");
const {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  approveLeave,
  rejectLeave,
  grantExtraLeave,
} = require("../controllers/leaveController");

const router = express.Router();

router.post("/apply", applyLeave);
router.get("/employee/:id", getMyLeaves);
router.get("/all", getAllLeaves);
router.put("/approve/:id", approveLeave);
router.put("/reject/:id", rejectLeave);
router.post("/grant", grantExtraLeave);

module.exports = router;