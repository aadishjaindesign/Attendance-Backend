const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const cron = require("node-cron");
const { autoMarkSundays } = require("./controllers/attendanceController");

dotenv.config();
connectDB();

const app = express();
cron.schedule("0 0 * * *", async () => {
  await autoMarkSundays(
    {},
    {
      json: () => {},
      status: () => ({
        json: () => {},
      }),
    }
  );

  console.log("Sunday cron checked");
});

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/settings", settingsRoutes);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Attendance API Running", time: new Date() });
});

// ── Keep-Alive endpoint (Render sleep prevent) ──
app.get("/ping", (req, res) => {
  res.json({ pong: true, time: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`✅ Server running on port ${PORT}`);

  try {
    await autoMarkSundays(
      {},
      {
        json: () => {},
        status: () => ({
          json: () => {},
        }),
      }
    );

    console.log("✅ Sunday auto check executed");
  } catch (err) {
    console.log(err);
  }
});