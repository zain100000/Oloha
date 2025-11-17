/**
 * @file Password management utilities
 * @module helpers/passwordHelper
 * @description Strong password validation, bcrypt hashing, and secure comparison.
 */

const bcrypt = require("bcrypt");

/**
 * Password regex for strong passwords
 * - Minimum 8 chars
 * - Uppercase, lowercase, number, special char
 * @type {RegExp}
 */
exports.passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,}$/;

/**
 * Validate password strength
 * @param {string} password
 * @returns {{ valid: boolean, message: string }}
 */
exports.validatePasswordStrength = (password) => {
  if (!password || typeof password !== "string") {
    return { valid: false, message: "Password must be a non-empty string" };
  }
  if (!exports.passwordRegex.test(password)) {
    return {
      valid: false,
      message:
        "Password must include uppercase, lowercase, number, special char, and be at least 8 chars long.",
    };
  }
  return { valid: true, message: "Password is strong." };
};

/** Recommended bcrypt cost factor */
const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 * @async
 * @param {string} password
 * @returns {Promise<string>}
 */
exports.hashPassword = async (password) => {
  if (!password) throw new Error("Password is required for hashing.");
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare plaintext password with hashed password
 * @async
 * @param {string} plain
 * @param {string} hashed
 * @returns {Promise<boolean>}
 */
exports.comparePassword = async (plain, hashed) => {
  if (!plain || !hashed) return false;
  return bcrypt.compare(plain, hashed);
};
