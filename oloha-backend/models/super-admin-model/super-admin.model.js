/**
 * @fileoverview Mongoose schema for SuperAdmin management with permissions.
 * @module models/superAdminModel
 * @description Represents a Super Admin user with elevated permissions, login tracking, session management, and password reset capabilities.
 */

const mongoose = require("mongoose");

/**
 * @schema SuperAdminSchema
 * @description Schema representing a Super Admin with:
 * - Profile metadata
 * - Authentication credentials
 * - Role-based access
 * - Login attempts and account lockout
 * - Session binding
 * - Password reset tokens
 */
const superAdminSchema = new mongoose.Schema(
  {
    /**
     * Profile picture URL
     * @type {string|null}
     */
    profilePicture: {
      type: String,
      default: null,
    },

    /**
     * Display name of the Super Admin
     * @type {string}
     */
    userName: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Email address (used for login)
     * @type {string}
     */
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    /**
     * Hashed password
     * @type {string}
     */
    password: {
      type: String,
      required: true,
    },

    /**
     * User role
     * @type {string}
     * @enum ["SUPERADMIN"]
     */
    role: {
      type: String,
      enum: ["SUPERADMIN"],
      default: "SUPERADMIN",
    },

    /**
     * Active status of the account
     * @type {boolean}
     */
    isActive: {
      type: Boolean,
      default: true,
    },

    /**
     * Last successful login timestamp
     * @type {Date|null}
     */
    lastLogin: {
      type: Date,
      default: null,
    },

    /**
     * Counter for consecutive failed login attempts
     * @type {number}
     */
    loginAttempts: {
      type: Number,
      default: 0,
    },

    /**
     * Timestamp until which the account is locked
     * @type {Date|null}
     */
    lockUntil: {
      type: Date,
      default: null,
    },

    /**
     * Session ID for binding JWT sessions
     * @type {string|null}
     */
    sessionId: {
      type: String,
      default: null,
    },

    /**
     * Token for password reset functionality
     * @type {string|null}
     */
    passwordResetToken: {
      type: String,
      default: null,
    },

    /**
     * Expiration timestamp for password reset token
     * @type {Date|null}
     */
    passwordResetExpires: {
      type: Date,
      default: null,
    },
  },
  {
    /**
     * Automatically include createdAt and updatedAt timestamps
     */
    timestamps: true,
  }
);

/**
 * Mongoose model for SuperAdmin
 * @type {import('mongoose').Model}
 */
module.exports = mongoose.model("SuperAdmin", superAdminSchema);
