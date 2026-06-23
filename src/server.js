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

const { autoMarkSundays, getISTDateString } = require("./controllers/attendanceController");
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
// IST time check helper
// Render UTC pe hai — IST = UTC + 5:30
// ══════════════════════════════════════════════════════
const getISTHour   = () => new Date(Date.now() + 5.5*60*60*1000).getUTCHours();
const getISTMinute = () => new Date(Date.now() + 5.5*60*60*1000).getUTCMinutes();

// ══════════════════════════════════════════════════════
// AUTO CHECKOUT — raat 10:00 PM IST
// Cron: UTC 16:30 = IST 22:00
// "30 16 * * *" = UTC 16:30 = IST 22:00
// ══════════════════════════════════════════════════════
const runAutoCheckout = async () => {
  try {
    console.log("🔥 Auto Checkout Running — IST 10:00 PM");
    const todayStr = getISTDateString();

    const records = await Attendance.find({
      date: todayStr,
      checkOut: null,
      status: "Present",
    });

    console.log(`Records without checkout: ${records.length}`);

    for (const record of records) {
      // IST 22:00 = UTC 16:30
      const checkoutTime = new Date(Date.now()); // current time = ~22:00 IST

      record.checkOut = checkoutTime;
      const hours = (record.checkOut - record.checkIn) / (1000 * 60 * 60);
      record.status = hours < 4 ? "Half Day" : "Present";
      await record.save();

      console.log(`✅ Auto checked out: ${record.employee}`);
    }

    console.log("✅ Auto Checkout Done");
  } catch (err) {
    console.error("❌ Auto Checkout Error:", err.message);
  }
};

// UTC 16:30 = IST 22:00 (10 PM)
cron.schedule("30 16 * * *", runAutoCheckout);

// ══════════════════════════════════════════════════════
// AUTO SUNDAY MARK — raat 12:01 AM IST (UTC 18:31 prev day)
// UTC 18:31 = IST 00:01
// ══════════════════════════════════════════════════════
cron.schedule("31 18 * * *", async () => {
  console.log("📅 Sunday auto-mark check");
  await autoMarkSundays();
});

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

// Manual trigger endpoint (testing ke liye)
app.post("/api/admin/trigger-checkout", async (req, res) => {
  await runAutoCheckout();
  res.json({ message: "Auto checkout triggered manually" });
});

// ══════════════════════════════════════════════════════
// START
// ══════════════════════════════════════════════════════
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`✅ Server running on port ${PORT}`);

  // Startup pe Sunday check
  try {
    await autoMarkSundays();
    console.log("✅ Sunday auto check executed on startup");
  } catch (err) {
    console.error(err);
  }
});