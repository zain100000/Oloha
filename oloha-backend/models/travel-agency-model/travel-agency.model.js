/**
 * @fileoverview Mongoose schema for Travel Agencies within the Oloha platform.
 * @module models/TravelAgency
 * @description
 * Defines the data structure, validation, and relationships for travel agencies.
 * Includes:
 * - Basic profile and account credentials
 * - Verification documents and business details
 * - Package, bookings, and review associations
 * - Status management
 */

const mongoose = require("mongoose");

/**
 * Travel Agency Schema
 * Represents registered travel agencies on the Oloha platform.
 * Includes profile details, verification docs, linked packages, bookings,
 * revenue tracking, and operational status.
 *
 * @typedef {Object} TravelAgency
 * @property {String} name - Agency name.
 * @property {String} email - Unique email used for login.
 * @property {String} password - Hashed password.
 * @property {String} description - About the agency.
 * @property {String} logo - Cloudinary URL for logo.
 * @property {String} coverImage - Banner/cover image URL.
 * @property {String} contactNumber - Primary contact number.
 * @property {String} address - Business address.
 * @property {Boolean} isVerified - Whether agency is verified by admin.
 * @property {Array} verificationDocs - Uploaded business/legal documents.
 * @property {Array<ObjectId>} packages - Linked travel packages.
 * @property {Array<ObjectId>} bookings - Linked bookings.
 * @property {Number} rating - Average rating based on reviews.
 * @property {Number} totalReviews - Number of reviews received.
 * @property {String} status - Account status: active, suspended, pending.
 */

const travelAgencySchema = new mongoose.Schema(
  {
    /* ---------------------------------------------------------------------- */
    /*                           ACCOUNT INFORMATION                          */
    /* ---------------------------------------------------------------------- */

    /**
     * Name of the agency.
     * @type {String}
     * @required
     */
    agencyName: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Unique email used to authenticate the agency.
     * @type {String}
     * @required
     */
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    /**
     * Hashed password stored securely.
     * @type {String}
     * @required
     */
    password: {
      type: String,
      required: true,
    },

    /**
     * role
     * @type {string}
     * @enum ["AGENCY"]
     */
    role: {
      type: String,
      enum: ["AGENCY"],
      default: "AGENCY",
    },

    /* ---------------------------------------------------------------------- */
    /*                           PROFILE INFORMATION                           */
    /* ---------------------------------------------------------------------- */

    /**
     * Description of the agency.
     * @type {String}
     */
    description: {
      type: String,
      default: null,
    },

    /**
     * Cloudinary URL for the logo image.
     * @type {String}
     */
    agencyLogo: {
      type: String,
      default: null,
    },

    /**
     * Banner/cover image URL.
     * @type {String}
     */
    coverImage: {
      type: String,
      default: null,
    },

    /**
     * Primary contact number.
     * @type {String}
     * @required
     */
    contactNumber: {
      type: String,
      required: true,
    },

    /**
     * Physical business address.
     * @type {String}
     */
    address: {
      type: String,
      default: null,
    },

    /* ---------------------------------------------------------------------- */
    /*                          VERIFICATION DOCUMENTS                         */
    /* ---------------------------------------------------------------------- */

    /**
     * Business verification documents uploaded by the agency.
     * @type {Array<{docType: String, docUrl: String, uploadedAt: Date}>}
     */
    verificationDocs: [
      {
        docType: String,
        docUrl: String,
        uploadedAt: Date,
      },
    ],

    /**
     * Platform-level verification status.
     * @type {Boolean}
     */
    isVerified: {
      type: Boolean,
      default: false,
    },

    /* ---------------------------------------------------------------------- */
    /*                       RELATIONSHIPS (PACKAGES & BOOKINGS)               */
    /* ---------------------------------------------------------------------- */

    /**
     * Packages created by this agency.
     * @type {Array<ObjectId>}
     * @ref Package
     */
    packages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Package",
      },
    ],

    /**
     * Bookings received for agency-created packages.
     * @type {Array<ObjectId>}
     * @ref Booking
     */
    bookings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
      },
    ],

    /* ---------------------------------------------------------------------- */
    /*                         REVIEWS & RATINGS AGGREGATION                   */
    /* ---------------------------------------------------------------------- */

    /**
     * Aggregated rating score.
     * @type {Number}
     */
    rating: {
      type: Number,
      default: 0,
    },

    /**
     * Count of all reviews the agency has received.
     * @type {Number}
     */
    totalReviews: {
      type: Number,
      default: 0,
    },

    /* ---------------------------------------------------------------------- */
    /*                        ACCOUNT STATUS                                  */
    /* ---------------------------------------------------------------------- */

    /**
     * Platform-level account status.
     * @enum ["active", "suspended", "pending"]
     * @type {String}
     */
    status: {
      type: String,
      enum: ["PENDING", "ACTIVATED", "SUSPENDED", "BANNED"],
      default: "PENDING",
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
  { timestamps: true }
);

module.exports = mongoose.model("Agency", travelAgencySchema);
