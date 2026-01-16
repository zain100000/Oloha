/**
 * @file Main Express application - Oloha Backend API
 * Production-ready with full security hardening
 */

const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
require("dotenv").config();

const {
  securityMiddleware,
} = require("./middlewares/security-middleware/security.middleware");

const app = express();

// ==================================================
// Apply All Security Middleware (FIXED ORDER)
// ==================================================
securityMiddleware(app);

// ==================================================
// Core Middlewares
// ==================================================
app.use(cookieParser());
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));

// Logging only in development
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ==================================================
// Health & Root Routes
// ==================================================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Oloha Backend API is Running Securely",
    uptime: process.uptime(),
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ==================================================
// Import Routes
// ==================================================
const superAdminRoute = require("./routes/super-admin-route/super-admin.route");
const travelAgencyRoute = require("./routes/travel-agency-route/travel-agency.route");
const userRoute = require("./routes/user-route/user.route");
const sharedPasswordResetRoute = require("./routes/shared-route/shared-password.reset.route");
const packageRoute = require("./routes/package-route/package.route");

// ==================================================
// API Routes
// ==================================================
app.use("/api/super-admin", superAdminRoute);
app.use("/api/agency", travelAgencyRoute);
app.use("/api/user", userRoute);
app.use("/api/password", sharedPasswordResetRoute);
app.use("/api/package", packageRoute);

// ==================================================
// 404 Handler
// ==================================================
app.get("/api/health", (req, res) => {
  res.status(201).json({
    success: true,
    message: "Server is running healthy",
    timestamp: new Date().toISOString(),
  });
});

// ==================================================
// MongoDB Connection + Server Start
// ==================================================
const PORT = process.env.PORT || 8000;

mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log("Connected to MongoDB Successfully");
    app.listen(PORT, () => {
      console.log(`Oloha API Running Securely on PORT ${PORT}`);
      console.log(`Health Check: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((err) => {
    console.error("MongoDB Connection Failed:", err.message);
    process.exit(1);
  });

// ==================================================
// Graceful Shutdown
// ==================================================
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

function gracefulShutdown() {
  console.log("\nGraceful shutdown initiated...");
  mongoose.connection.close(false, () => {
    console.log("MongoDB connection closed.");
    process.exit(0);
  });
}

module.exports = app;

