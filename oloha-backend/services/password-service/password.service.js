/**
 * @fileoverview Password service utilities for Oloha backend.
 * @module services/passwordService
 * @description Provides functions to generate, verify, and reset user passwords securely using AES-256-GCM encryption and JWT.
 */

const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  passwordRegex,
  hashPassword,
} = require("../../helpers/password-helper/password.helper");

if (!process.env.PASSWORD_RESET_SECRET) {
  throw new Error("Missing PASSWORD_RESET_SECRET in environment");
}

const SECRET = process.env.PASSWORD_RESET_SECRET;

/**
 * Encrypts plaintext using AES-256-GCM.
 * @function encrypt
 * @param {string} plaintext - Data to encrypt.
 * @returns {{ iv: string, authTag: string, ciphertext: string }} Encrypted payload.
 */
const encrypt = (plaintext) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(SECRET, "hex"),
    iv
  );
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString("hex"),
    ciphertext: encrypted.toString("hex"),
    authTag: authTag.toString("hex"),
  };
};

/**
 * Decrypts AES-256-GCM encrypted payload.
 * @function decrypt
 * @param {{ iv: string, authTag: string, ciphertext: string }} payload - Encrypted data.
 * @returns {string} Decrypted plaintext.
 */
const decrypt = (payload) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(SECRET, "hex"),
    Buffer.from(payload.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};

/**
 * Generates an encrypted JWT token for password reset.
 * @function generateResetToken
 * @param {{ id: string, role: string }} payload - User identifier and role.
 * @param {string} [expiresIn="1h"] - Token expiry duration.
 * @returns {string} Base64url encoded encrypted token.
 */
const generateResetToken = (payload, expiresIn = "1h") => {
  const token = jwt.sign(payload, SECRET, { algorithm: "HS256", expiresIn });
  const encrypted = encrypt(token);
  return Buffer.from(JSON.stringify(encrypted)).toString("base64url");
};

/**
 * Verifies an encrypted password reset token and returns payload.
 * @function verifyResetToken
 * @param {string} token - Encrypted token string.
 * @returns {{ id: string, role: string }} Decoded token payload.
 * @throws {Error} If token is invalid or expired.
 */
const verifyResetToken = (token) => {
  try {
    const encryptedPayload = JSON.parse(
      Buffer.from(token, "base64url").toString()
    );
    const decrypted = decrypt(encryptedPayload);
    return jwt.verify(decrypted, SECRET, { algorithms: ["HS256"] });
  } catch (err) {
    throw new Error("Invalid or expired reset token");
  }
};

/**
 * Resets a user's password securely.
 * @function resetUserPassword
 * @param {object} userDoc - Mongoose user document.
 * @param {string} newPassword - New password string.
 * @throws {Error} If password does not meet complexity requirements or matches the old password.
 */
const resetUserPassword = async (userDoc, newPassword) => {
  if (!passwordRegex.test(newPassword)) {
    throw new Error("Password does not meet complexity requirements");
  }
  const isSame = await bcrypt.compare(newPassword, userDoc.password);
  if (isSame) throw new Error("New password cannot match the old password");

  userDoc.password = await hashPassword(newPassword);
  userDoc.passwordChangedAt = new Date();
  userDoc.sessionId = crypto.randomBytes(32).toString("hex");
  await userDoc.save();
};

module.exports = {
  generateResetToken,
  verifyResetToken,
  resetUserPassword,
};
