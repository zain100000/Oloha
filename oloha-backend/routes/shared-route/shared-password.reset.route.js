/**
 * @fileoverview Password management routes for Oloha backend
 * @module routes/password
 * @description Defines routes for handling password reset functionality:
 *  - Requesting a password reset link
 *  - Resetting password using a valid token
 */

const express = require("express");
const router = express.Router();
const sharedController = require("../../controllers/shared-controller/shared-password.reset.controller");

/**
 * @description Sends a password reset link to the user’s email if the account exists.
 */
router.post("/forgot-password", sharedController.forgotPassword);

/**
 * @description Resets the user’s password using a valid token.
 */
router.post("/reset-password/:token", sharedController.resetPassword);

/**
 * @description Verifies if a password reset token is valid and not expired.
 */
router.post("/verify-token/:token", sharedController.verifyToken);

module.exports = router;
