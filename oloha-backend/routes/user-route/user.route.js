/**
 * @fileoverview Express routes for User authentication and profile management
 * @module routes/superAdminRoutes
 * @description Provides endpoints for:
 *  - User registration
 *  - Login with AES-256-GCM encrypted JWT
 *  - Fetching User details by ID
 *  - Logout with session invalidation
 */

const express = require("express");
const router = express.Router();
const userController = require("../../controllers/user-controller/user.controller");
const {
  encryptedAuthMiddleware,
  authLimiter,
} = require("../../middlewares/auth-middleware/auth.middleware");
const cloudinaryUtility = require("../../utilities/cloudinary-utility/cloudinary.utility");

/**
 * @description Registers a new User with optional profile picture upload.
 */
router.post(
  "/signup-user",
  cloudinaryUtility.upload,
  userController.registerUser
);

/**
 * @description Logs in a User and returns AES-256-GCM encrypted JWT.
 */
router.post("/signin-user", authLimiter, userController.loginUser);

/**
 * @description Retrieves User details by ID (excluding password and internal fields).
 */
router.get(
  "/get-user-by-id/:userId",
  encryptedAuthMiddleware,
  userController.getUserById
);

/**
 * @description Update User details by ID
 */
router.patch(
  "/update-user-by-id/:userId",
  encryptedAuthMiddleware,
  cloudinaryUtility.upload,
  userController.updateUser
);

/**
 * @description Delete User details by ID
 */
router.delete(
  "/delete-user-by-id/:userId",
  encryptedAuthMiddleware,
  userController.deleteUser
);

/**
 * @description Logs out a User, invalidates the session, and clears JWT cookie.
 */
router.post("/logout-user", encryptedAuthMiddleware, userController.logoutUser);

module.exports = router;
