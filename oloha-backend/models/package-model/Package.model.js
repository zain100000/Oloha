/**
 * @fileoverview Mongoose schema for Travel Packages within the Oloha platform.
 * @module models/Package
 * @description
 * Defines package details offered by travel agencies, including pricing,
 * itinerary, media, availability, and linked bookings.
 */

const mongoose = require("mongoose");

/**
 * Package Schema
 * Represents a travel package created by an agency.
 *
 * @typedef {Object} Package
 * @property {String} packageTitle - Title of the travel package.
 * @property {String} description - Detailed overview of the package.
 * @property {Array<String>} images - Cloudinary URLs for package images.
 * @property {Number} price - Base price per person.
 * @property {Number} discount - Discount percentage (optional).
 * @property {String} duration - Total duration (e.g., "3 Days 2 Nights").
 * @property {Array} itinerary - Day-wise itinerary breakdown.
 * @property {Number} availableSlots - Total booking capacity.
 * @property {String} category - Package category (e.g., Tour, Umrah).
 * @property {ObjectId} agency - Linked agency.
 * @property {Array<ObjectId>} bookings - Bookings made under this package.
 * @property {String} status - Package status.
 */

const packageSchema = new mongoose.Schema(
  {
    /* ---------------------------------------------------------------------- */
    /*                               BASIC DETAILS                             */
    /* ---------------------------------------------------------------------- */

    /**
     * Title of the travel package.
     * @type {String}
     * @required
     */
    packageTitle: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Detailed description of the package.
     * @type {String}
     */
    description: {
      type: String,
      default: "",
    },

    /**
     * Array of Cloudinary URLs for images.
     * @type {Array<String>}
     */
    images: [
      {
        type: String,
      },
    ],

    /* ---------------------------------------------------------------------- */
    /*                               PRICING INFO                              */
    /* ---------------------------------------------------------------------- */

    /**
     * Price per person.
     * @type {Number}
     * @required
     */
    price: {
      type: Number,
      required: true,
    },

    /**
     * Discount percentage.
     * @type {Number}
     */
    discount: {
      type: Number,
      default: 0,
    },

    /* ---------------------------------------------------------------------- */
    /*                                ITINERARY                                */
    /* ---------------------------------------------------------------------- */

    /**
     * Total trip duration (e.g., "3 Days 2 Nights").
     * @type {String}
     */
    duration: {
      type: String,
      default: "",
    },

    /**
     * Day-wise itinerary.
     * @type {Array<{day: String, activities: String}>}
     */
    itinerary: [
      {
        day: String,
        activities: String,
      },
    ],

    /* ---------------------------------------------------------------------- */
    /*                           BOOKING CAPACITY                              */
    /* ---------------------------------------------------------------------- */

    /**
     * Available slots for booking.
     * @type {Number}
     * @required
     */
    availableSlots: {
      type: Number,
      required: true,
    },

    /* ---------------------------------------------------------------------- */
    /*                             CLASSIFICATION                              */
    /* ---------------------------------------------------------------------- */

    /**
     * Package category.
     * @enum ["TOUR", "HONEYMOON", "ADVENTURE", "GROUP"]
     * @type {String}
     */
    category: {
      type: String,
      enum: ["TOUR", "HONEYMOON", "ADVENTURE", "GROUP"],
      default: "TOUR",
    },

    /* ---------------------------------------------------------------------- */
    /*                           RELATIONAL FIELDS                             */
    /* ---------------------------------------------------------------------- */

    /**
     * Agency that created this package.
     * @type {ObjectId}
     * @ref Agency
     * @required
     */
    agency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency",
      required: true,
    },

    /**
     * Bookings linked to this package.
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
    /*                              STATUS INFO                                */
    /* ---------------------------------------------------------------------- */

    /**
     * Status of the package.
     * @enum ["ACTIVE", "INACTIVE", "DELETED"]
     * @type {String}
     */

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "DELETED"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Package", packageSchema);
