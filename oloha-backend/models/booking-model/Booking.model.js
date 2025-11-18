/**
 * @fileoverview Mongoose schema for Bookings within the Oloha platform.
 * @module models/Booking
 * @description
 * Defines booking details including customer info, package linkage,
 * payment details, participant counts, and booking status.
 */

const mongoose = require("mongoose");

/**
 * Booking Schema
 * Represents a customer booking made for a package.
 *
 * @typedef {Object} Booking
 * @property {ObjectId} agency - Agency receiving the booking.
 * @property {ObjectId} package - Package booked.
 * @property {Number} totalPersons - Number of travelers.
 * @property {Number} totalPrice - Final price after discount.
 * @property {String} paymentMethod - Payment method used.
 * @property {String} paymentStatus - Payment state.
 * @property {String} bookingStatus - Booking lifecycle state.
 */

const bookingSchema = new mongoose.Schema(
  {
    /* ---------------------------------------------------------------------- */
    /*                           RELATIONAL FIELDS                             */
    /* ---------------------------------------------------------------------- */

    /**
     * Agency receiving the booking.
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
     * Package being booked.
     * @type {ObjectId}
     * @ref Package
     * @required
     */
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
    },

    /* ---------------------------------------------------------------------- */
    /*                        CUSTOMER INFORMATION                             */
    /* ---------------------------------------------------------------------- */

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /**
     * Number of travelers included in this booking.
     * @type {Number}
     */
    numberOfPersons: {
      type: Number,
      required: true,
    },

    /* ---------------------------------------------------------------------- */
    /*                               BOOKING DATA                              */
    /* ---------------------------------------------------------------------- */

    /**
     * Number of people included in the booking.
     * @type {Number}
     * @required
     */
    totalPersons: {
      type: Number,
      required: true,
    },

    /**
     * Final calculated amount (after discounts).
     * @type {Number}
     * @required
     */
    totalPrice: {
      type: Number,
      required: true,
    },

    /* ---------------------------------------------------------------------- */
    /*                               PAYMENT INFO                              */
    /* ---------------------------------------------------------------------- */

    /**
     * Payment method used.
     * @enum ["CARD", "BANK_TRANSFER", "JAZZCASH", "EASYPaisa", "CASH"]
     * @type {String}
     */
    paymentMethod: {
      type: String,
      enum: ["CARD", "BANK_TRANSFER", "JAZZCASH", "EASYPaisa", "CASH"],
      default: "CASH",
    },

    /**
     * Payment status.
     * @enum ["PENDING", "PAID", "FAILED", "REFUNDED"]
     * @type {String}
     */
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PENDING",
    },

    /* ---------------------------------------------------------------------- */
    /*                               BOOKING STATUS                            */
    /* ---------------------------------------------------------------------- */

    /**
     * Booking lifecycle status.
     * @enum ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]
     * @type {String}
     */
    bookingStatus: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
