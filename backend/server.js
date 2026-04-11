require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const initSocket = require("./src/websocket/socket");
const errorHandler = require("./src/middleware/errorHandler");

// Route imports
const authRoutes = require("./src/routes/auth");
const parentRoutes = require("./src/routes/parents");
const studentRoutes = require("./src/routes/students");
const busRoutes = require("./src/routes/buses");
const driverRoutes = require("./src/routes/drivers");
const attendanceRoutes = require("./src/routes/attendance");
const routeRoutes = require("./src/routes/routes");
const notificationRoutes = require("./src/routes/notifications");

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);
app.set("io", io);

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "CrowdSync API", version: "1.0.0" });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/parents", parentRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/buses", busRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/notify", notificationRoutes);

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`[CrowdSync] Server running on port ${PORT}`);
  console.log(`[CrowdSync] WebSocket ready`);
});
