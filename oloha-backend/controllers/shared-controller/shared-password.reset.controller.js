/**
 * @file Password reset controller
 * @description Handles password reset functionality for different user roles.
 * Provides endpoints to request a password reset link and reset the password using a token.
 * Supports dynamic lookup of user models based on role.
 *
 * Endpoints:
 * 1. POST /api/password/forgot-password - Request a password reset link.
 * 2. POST /api/password/reset-password/:token - Reset the password using a valid token.
 *
 * @module controllers/password-controller
 */

const {
  generateResetToken,
  verifyResetToken,
  resetUserPassword,
} = require("../../services/password-service/password.service");
const SuperAdmin = require("../../models/super-admin-model/super-admin.model");
const Agency = require("../../models/travel-agency-model/travel-agency.model");
const {
  sendPasswordResetEmail,
} = require("../../helpers/email-helper/email.helper");

/**
 * Get Mongoose model by user role
 * @param {string} role - Role of the user (e.g., SUPERADMIN)
 * @returns {import('mongoose').Model} Corresponding Mongoose model
 * @throws {Error} Throws if the role is invalid
 */
const getModelByRole = (role) => {
  switch (role) {
    case "SUPERADMIN":
      return SuperAdmin;

    case "AGENCY":
      return Agency;
    default:
      throw new Error("Invalid role");
  }
};

/**
 * Handle request for password reset link
 * POST /api/password/forgot-password
 *
 * @async
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res
        .status(400)
        .json({ success: false, message: "Email and role are required" });
    }

    const Model = getModelByRole(role);
    const user = await Model.findOne({ email });

    // Respond with generic message to prevent email enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If an account exists, a reset link has been sent",
      });
    }

    const token = generateResetToken({ id: user._id.toString(), role }, "1h");
    await sendPasswordResetEmail(email, token, role);

    res.status(200).json({
      success: true,
      message: "Password reset link sent successfully",
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

/**
 * Reset user password using token
 * POST /api/password/reset-password/:token
 *
 * @async
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "New password is required" });
    }

    const payload = verifyResetToken(token);
    const Model = getModelByRole(payload.role);
    const user = await Model.findById(payload.id);

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token" });
    }

    await resetUserPassword(user, newPassword);

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .json({ success: false, message: error.message || "Server error" });
  }
};

/**
 * Verify if a password reset token is valid
 * POST /api/password/verify-token/:token
 *
 * @async
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
exports.verifyToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Token is required" });
    }

    // Verify the token
    const payload = verifyResetToken(token);

    res.status(200).json({
      success: true,
      message: "Token is valid",
      data: {
        userId: payload.id,
        role: payload.role,
        expiresAt: payload.exp, // JWT expiration timestamp
      },
    });
  } catch (error) {
    console.error("Token verification error:", error.message);
    res.status(400).json({
      success: false,
      message: error.message || "Invalid or expired token",
    });
  }
};
