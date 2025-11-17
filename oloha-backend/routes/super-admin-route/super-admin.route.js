/**
 * @fileoverview Express routes for Super Admin authentication and profile management
 * @module routes/superAdminRoutes
 * @description Provides endpoints for:
 *  - Super Admin registration
 *  - Login with AES-256-GCM encrypted JWT
 *  - Fetching Super Admin details by ID
 *  - Logout with session invalidation
 */

const express = require("express");
const router = express.Router();

const superAdminController = require("../../controllers/super-admin-controller/super-admin.controller");
const {
  encryptedAuthMiddleware,
  authLimiter,
} = require("../../middlewares/auth-middleware/auth.middleware");
const cloudinaryUtility = require("../../utilities/cloudinary-utility/cloudinary.utility");

/**
 * @route POST /api/super-admin/signup-super-admin
 * @description Registers a new Super Admin with optional profile picture upload.
 * @access Public
 * @example
 * POST /api/super-admin/signup-super-admin
 * Body: { "userName": "John Doe", "email": "admin@example.com", "password": "StrongP@ssw0rd" }
 */
router.post(
  "/signup-super-admin",
  cloudinaryUtility.upload,
  superAdminController.registerSuperAdmin
);

/**
 * @route POST /api/super-admin/signin-super-admin
 * @description Logs in a Super Admin and returns AES-256-GCM encrypted JWT.
 * @access Public
 * @example
 * POST /api/super-admin/signin-super-admin
 * Body: { "email": "admin@example.com", "password": "StrongP@ssw0rd" }
 */
router.post(
  "/signin-super-admin",
  authLimiter,
  superAdminController.loginSuperAdmin
);

/**
 * @route GET /api/super-admin/get-super-admin-by-id/:superAdminId
 * @description Retrieves Super Admin details by ID (excluding password and internal fields).
 * @access Private
 * @example
 * GET /api/super-admin/get-super-admin-by-id/64f8c9a1e7d4f72f3a2c123
 */
router.get(
  "/get-super-admin-by-id/:superAdminId",
  encryptedAuthMiddleware,
  superAdminController.getSuperAdminById
);

/**
 * @route POST /api/super-admin/logout-super-admin
 * @description Logs out a Super Admin, invalidates the session, and clears JWT cookie.
 * @access Private
 * @example
 * POST /api/super-admin/logout-super-admin
 */
router.post(
  "/logout-super-admin",
  encryptedAuthMiddleware,
  superAdminController.logoutSuperAdmin
);

module.exports = router;
