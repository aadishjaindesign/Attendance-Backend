const express  = require("express");
const cors     = require("cors");
const dotenv   = require("dotenv");
const cron     = require("node-cron");

const connectDB        = require("./config/db");
const authRoutes       = require("./routes/authRoutes");
const adminRoutes      = require("./routes/adminRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const leaveRoutes      = require("./routes/leaveRoutes");
const settingsRoutes   = require("./routes/settingsRoutes");

const { autoMarkAttendance, getISTDateString } = require("./controllers/attendanceController");
const Attendance = require("./models/Attendance");

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// ══════════════════════════════════════════════════════
// AUTO CHECKOUT — raat 10:00 PM IST
// Render UTC pe hai — IST = UTC + 5:30
// UTC 16:30 = IST 22:00
// ══════════════════════════════════════════════════════
const runAutoCheckout = async () => {
  try {
    console.log("🔥 Auto Checkout Running — IST 10:00 PM");
    const todayStr = getISTDateString();

    // Sirf woh records jo aaj ke hain, Present hain, aur checkout nahi hua
    const records = await Attendance.find({
      date: todayStr,
      checkOut: null,
      status: "Present",
    });

    console.log(`Records without checkout: ${records.length}`);

    for (const record of records) {
      // IST 22:00 = UTC 16:30 — fixed checkout time
      const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
      // Checkout time as proper UTC
      const checkoutTime = new Date(Date.now());
      record.checkOut = checkoutTime;

      // Hours calculate karo checkIn se checkOut tak
      const hours = (checkoutTime - new Date(record.checkIn)) / (1000 * 60 * 60);
      // 4 ghante se kam = Half Day, nahi to Present rehne do
      record.status = hours < 4 ? "Half Day" : "Present";
      await record.save();
      console.log(`✅ Auto checked out: ${record.employee} | Hours: ${hours.toFixed(2)} | Status: ${record.status}`);
    }

    console.log("✅ Auto Checkout Done");
  } catch (err) {
    console.error("❌ Auto Checkout Error:", err.message);
  }
};

// ══════════════════════════════════════════════════════
// AUTO SUNDAY/HOLIDAY MARK — raat 12:01 AM IST
// UTC 18:31 = IST 00:01
// IMPORTANT: Startup pe NAHI chalega — sirf cron se chalega
// ══════════════════════════════════════════════════════
cron.schedule("31 18 * * *", async () => {
  console.log("📅 Auto attendance mark — Sunday/Holiday check");
  await autoMarkAttendance();
}, { timezone: "UTC" });

// UTC 16:30 = IST 22:00 (10 PM auto checkout)
cron.schedule("30 16 * * *", runAutoCheckout, { timezone: "UTC" });

// ══════════════════════════════════════════════════════
// KEEP-ALIVE — har 9 minute Render ko jaag rakho
// ══════════════════════════════════════════════════════
cron.schedule("*/9 * * * *", () => {
  const url = process.env.BACKEND_URL || "https://attendance-backend-ym0q.onrender.com";
  fetch(`${url}/ping`)
    .then(() => console.log("🏓 Keep-alive ping"))
    .catch(() => {});
});

// ══════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════
app.use("/api/auth",       authRoutes);
app.use("/api/admin",      adminRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave",      leaveRoutes);
app.use("/api/settings",   settingsRoutes);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Attendance API Running", time: new Date() });
});

app.get("/ping", (req, res) => {
  res.json({ pong: true, time: new Date(), ist: new Date(Date.now() + 5.5*60*60*1000).toISOString() });
});

// Manual trigger — sirf testing ke liye
app.post("/api/admin/trigger-checkout", async (req, res) => {
  await runAutoCheckout();
  res.json({ message: "Auto checkout triggered manually" });
});

app.post("/api/admin/trigger-auto-attendance", async (req, res) => {
  await autoMarkAttendance();
  res.json({ message: "Auto attendance triggered manually" });
});

// ══════════════════════════════════════════════════════
// START — Startup pe koi auto function NAHI chalega
// ══════════════════════════════════════════════════════
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`⏰ Auto Checkout: IST 10:00 PM daily`);
  console.log(`📅 Auto Attendance: IST 12:01 AM daily`);
  console.log(`🏓 Keep-alive: every 9 minutes`);
  // STARTUP PE KUCH AUTO NAHI CHALEGA
  // Kyunki agar server restart ho to galat time pe chal ke sab ko mark kar deta hai
});