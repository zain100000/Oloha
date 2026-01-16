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
 * @description Registers a new Super Admin with optional profile picture upload.
 */
router.post(
  "/signup-super-admin",
  cloudinaryUtility.upload,
  superAdminController.registerSuperAdmin
);

/**
 
 * @description Logs in a Super Admin and returns AES-256-GCM encrypted JWT.  
 */
router.post(
  "/signin-super-admin",
  authLimiter,
  superAdminController.loginSuperAdmin
);

/**
 
 * @description Retrieves Super Admin details by ID (excluding password and internal fields).  
 */
router.get(
  "/get-super-admin-by-id/:superAdminId",
  encryptedAuthMiddleware,
  superAdminController.getSuperAdminById
);

/**
 
 * @description Logs out a Super Admin, invalidates the session, and clears JWT cookie.  
 */
router.post(
  "/logout-super-admin",
  encryptedAuthMiddleware,
  superAdminController.logoutSuperAdmin
);

// ================== SUPER ADMIN ACTION ROUTES =============
// ==========================================================
// ==========================================================
// ==========================================================

/**
 * @description Update agency status (Activate, Suspend, Ban) by Super Admin.
 */
router.put(
  "/action/update-agency-status/:agencyId",
  encryptedAuthMiddleware,
  superAdminController.updateAgencyStatus
);

/**
 
 * @description Update agency verification status by Super Admin.
 */
router.put(
  "/action/update-verification-status/:agencyId",
  encryptedAuthMiddleware,
  superAdminController.updateAgencyVerification
);

/**
 * @description Retrieves all agencies.
 */
router.get("/action/get-all-agencies", superAdminController.getAllAgencies);

/**
 * @description Retrieves all packages.
 */
router.get("/action/get-all-packages", superAdminController.getAllPackages);

/**
 * @description Retrieves all users.
 */
router.get("/action/get-all-users", superAdminController.getAllUsers);

module.exports = router;
