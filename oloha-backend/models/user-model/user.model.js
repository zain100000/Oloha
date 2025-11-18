/**
 * @fileoverview Mongoose schema for User management within the Oloha platform.
 * @module models/userModel
 * @description Represents a standard user with travel booking capabilities, profile management,
 * authentication tracking, and travel history.
 */

const mongoose = require("mongoose");

/**
 * @schema UserSchema
 * @description Schema representing a platform user with:
 * - Personal profile information
 * - Authentication and security features
 * - Travel booking history
 * - Session management
 * - Account security measures
 */
const userSchema = new mongoose.Schema(
  {
    /**
     * Full name of the user
     * @type {string}
     * @required
     */
    userName: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Unique email address for authentication and communication
     * @type {string}
     * @required
     * @unique
     */
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    /**
     * Securely hashed password
     * @type {string}
     * @required
     * @minlength 8
     */
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    /**
     * Contact phone number
     * @type {string}
     * @required
     */
    phone: {
      type: String,
      required: true,
    },

    /**
     * Address
     * @type {string}
     * @required
     */
    address: {
      type: String,
      required: true,
    },

    /**
     * Profile image URL (Cloudinary)
     * @type {string|null}
     */
    profilePicture: {
      type: String,
      default: null,
    },

    /**
     * User role within the platform
     * @type {string}
     * @enum ["USER"]
     */
    role: {
      type: String,
      enum: ["USER"],
      default: "USER",
    },

    /**
     * Historical record of user's completed travels
     * @type {Array<Object>}
     */
    travelHistory: [
      {
        /**
         * Reference to the booked package
         * @type {mongoose.Schema.Types.ObjectId}
         * @ref Package
         */
        packageId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Package",
        },

        /**
         * Destination of the travel
         * @type {string}
         */
        destination: String,

        /**
         * Date when travel occurred
         * @type {Date}
         */
        travelDate: Date,
      },
    ],

    /**
     * All bookings made by the user
     * @type {Array<mongoose.Schema.Types.ObjectId>}
     * @ref Booking
     */
    bookings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
      },
    ],

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
     * Timestamp until which the account is locked due to failed attempts
     * @type {Date|null}
     */
    lockUntil: {
      type: Date,
      default: null,
    },

    /**
     * Unique session identifier for JWT session binding
     * @type {string|null}
     */
    sessionId: {
      type: String,
      default: null,
    },

    /**
     * Secure token for password reset functionality
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
     * Automatically manage createdAt and updatedAt timestamps
     */
    timestamps: true,
  }
);

/**
 * Mongoose model for User
 * @type {import('mongoose').Model}
 */
module.exports = mongoose.model("User", userSchema);
