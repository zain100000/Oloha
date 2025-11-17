/**
 * @fileoverview Password management routes for Oloha backend
 * @module routes/password
 * @description Defines routes for handling password reset functionality:
 *  - Requesting a password reset link
 *  - Resetting password using a valid token
 */

const express = require("express");
const router = express.Router();
const {
  forgotPassword,
  resetPassword,
  verifyToken,
} = require("../../controllers/shared-controller/shared-password.reset.controller");

/**
 * @route POST /api/password/forgot-password
 * @description Sends a password reset link to the user’s email if the account exists.
 * @access Public
 * @example
 * POST /api/password/forgot-password
 * Body: { "email": "user@example.com", "role": "SUPERADMIN" }
 */
router.post("/forgot-password", forgotPassword);

/**
 * @route POST /api/password/reset-password
 * @description Resets the user’s password using a valid token.
 * @access Public
 * @example
 * POST /api/password/reset-password
 * Body: { "newPassword": "StrongP@ssw0rd" }
 * Params: { "token": "secureTokenFromEmail" }
 */
router.post("/reset-password/:token", resetPassword);

/**
 * @route POST /api/password/verify-token/:token
 * @description Verifies if a password reset token is valid and not expired.
 * @access Public
 * @example
 * POST /api/password/verify-token/secureTokenFromEmail
 */
router.post("/verify-token/:token", verifyToken);

module.exports = router;
