/**
 * @file Centralized security middleware configuration for Oloha backend
 * @module middlewares/securityMiddleware
 * @description Implements best-practice security hardening including:
 * - HTTPS enforcement
 * - Helmet headers + CSP
 * - CORS hardening
 * - HTTP Parameter Pollution protection
 * - Rate limiting and slowdown
 * - Response compression
 */

const helmet = require("helmet");
const cors = require("cors");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const slowDown = require("express-slow-down");
const compression = require("compression");

/**
 * Apply security middleware to Express app
 * @param {import('express').Express} app
 */
exports.securityMiddleware = (app) => {
  // Enforce HTTPS in production
  if (process.env.NODE_ENV === "production") {
    app.use((req, res, next) => {
      if (
        req.headers["x-forwarded-proto"] !== "https" &&
        req.protocol !== "https"
      ) {
        return res
          .status(403)
          .json({ success: false, message: "HTTPS Required in Production" });
      }
      next();
    });
  }

  // Helmet for secure headers + CSP
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", "https:", "ws:", "wss:"],
          scriptSrc: ["'self'", "https:"],
          styleSrc: ["'self'", "'unsafe-inline'", "https:"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          fontSrc: ["'self'", "https:", "data:"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: "no-referrer" },
    })
  );

  // CORS configuration
  const allowedOrigins =
    process.env.ALLOWED_ORIGINS === "*"
      ? true
      : process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    })
  );

  // Convert req.query to writable object
  app.use((req, res, next) => {
    req.query = { ...req.query };
    next();
  });

  // HTTP Parameter Pollution protection
  app.use(hpp());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests from this IP. Please try again later.",
    },
  });
  app.use(limiter);

  // Slow down after threshold
  app.use(
    slowDown({
      windowMs: 15 * 60 * 1000,
      delayAfter: 50,
      delayMs: () => 500,
    })
  );

  // Response compression
  app.use(compression());
};
