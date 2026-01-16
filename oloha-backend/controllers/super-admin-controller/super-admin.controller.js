/**
 * @file Super Admin controller
 * @description Controller module for managing Super Admin authentication and profile operations with encrypted JWTs.
 * Supports:
 * - Registration with password validation and secure Cloudinary upload.
 * - Login system with AES-256-GCM encrypted JWTs, session tracking, and account lockout on repeated failed attempts.
 * - Retrieval of Super Admin details by ID.
 * - Logout functionality with session invalidation.
 *
 * @module controllers/superAdminController
 */

const bcrypt = require("bcrypt");
const SuperAdmin = require("../../models/super-admin-model/super-admin.model");
const Agency = require("../../models/travel-agency-model/travel-agency.model");
const User = require("../../models/user-model/user.model");
const Package = require("../../models/package-model/Package.model");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../../utilities/cloudinary-utility/cloudinary.utility");
const {
  passwordRegex,
  hashPassword,
} = require("../../helpers/password-helper/password.helper");
const {
  generateSecureToken,
} = require("../../helpers/token-helper/token.helper");
const {
  generateEncryptedToken,
} = require("../../middlewares/auth-middleware/auth.middleware");
const {
  sendAgencyStatusUpdateEmail,
  sendAgencyVerificationUpdateEmail,
} = require("../../helpers/email-helper/email.helper");

/**
 * Register a new Super Admin
 * POST /api/super-admin/signup-super-admin
 * Public access
 *
 * @async
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
exports.registerSuperAdmin = async (req, res) => {
  let uploadedFileUrl = null;
  try {
    const { userName, email, password } = req.body;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character",
      });
    }

    const existingSuperAdmin = await SuperAdmin.findOne({
      email: email.toLowerCase(),
      role: "SUPERADMIN",
    });

    if (existingSuperAdmin) {
      return res.status(409).json({
        success: false,
        message: "SuperAdmin with this email already exists",
      });
    }

    let userProfileImageUrl = null;
    if (req.files?.profilePicture) {
      const uploadResult = await uploadToCloudinary(
        req.files.profilePicture[0],
        "profilePicture"
      );
      userProfileImageUrl = uploadResult.url;
      uploadedFileUrl = uploadResult.url;
    }

    const hashedPassword = await hashPassword(password);

    const superAdmin = new SuperAdmin({
      profilePicture: userProfileImageUrl,
      userName,
      email: email.toLowerCase(),
      password: hashedPassword,
      isActive: true,
      role: "SUPERADMIN",
      lastLogin: null,
      loginAttempts: 0,
      lockUntil: null,
      sessionId: null,
    });

    await superAdmin.save();

    res.status(201).json({
      success: true,
      message: "SuperAdmin created successfully",
    });
  } catch (error) {
    if (uploadedFileUrl) {
      try {
        await deleteFromCloudinary(uploadedFileUrl);
      } catch (cloudErr) {
        console.error("Failed to rollback Cloudinary upload:", cloudErr);
      }
    }

    console.error("Error creating super admin:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Super Admin login with AES-256-GCM encrypted JWT
 * POST /api/super-admin/signin-super-admin
 * Public access
 *
 * @async
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
exports.loginSuperAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const superAdmin = await SuperAdmin.findOne({ email });

    if (!superAdmin) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    if (superAdmin.lockUntil && superAdmin.lockUntil > Date.now()) {
      const remaining = Math.ceil((superAdmin.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${remaining} minutes.`,
      });
    }

    if (superAdmin.lockUntil && superAdmin.lockUntil <= Date.now()) {
      superAdmin.loginAttempts = 0;
      superAdmin.lockUntil = null;
      await superAdmin.save();
    }

    const isMatch = await bcrypt.compare(password, superAdmin.password);

    if (!isMatch) {
      superAdmin.loginAttempts += 1;
      if (superAdmin.loginAttempts >= 3) {
        superAdmin.lockUntil = Date.now() + 30 * 60 * 1000; // Lock 30 minutes
      }
      await superAdmin.save();

      const message =
        superAdmin.lockUntil && superAdmin.lockUntil > Date.now()
          ? "Too many failed login attempts. Account locked for 30 minutes."
          : "Invalid credentials";

      return res.status(401).json({
        success: false,
        message,
        attempts: superAdmin.loginAttempts,
      });
    }

    superAdmin.loginAttempts = 0;
    superAdmin.lockUntil = null;
    superAdmin.lastLogin = new Date();
    superAdmin.sessionId = generateSecureToken();
    await superAdmin.save();

    const payload = {
      role: "SUPERADMIN",
      user: { id: superAdmin._id.toString(), email: superAdmin.email },
      sessionId: superAdmin.sessionId,
    };

    const encryptedToken = generateEncryptedToken(payload);

    res.cookie("accessToken", encryptedToken, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Super Admin login successfully!",
      superAdmin: {
        id: superAdmin._id,
        userName: superAdmin.userName,
        email: superAdmin.email,
      },
      token: encryptedToken,
      expiresIn: 24 * 60 * 60,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Get Super Admin by ID
 * GET /api/super-admin/get-super-admin-by-id/:superAdminId
 * Private access
 *
 * @async
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
exports.getSuperAdminById = async (req, res) => {
  try {
    const { superAdminId } = req.params;

    const superAdmin =
      await SuperAdmin.findById(superAdminId).select("-password -__v");

    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        message: "Super Admin not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Super Admin fetched successfully",
      superAdmin,
    });
  } catch (error) {
    console.error("Fetch SuperAdmin Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Logout Super Admin
 * POST /api/super-admin/logout-super-admin
 * Private access
 *
 * @async
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
exports.logoutSuperAdmin = async (req, res) => {
  try {
    if (req.user?.id) {
      await SuperAdmin.findByIdAndUpdate(req.user.id, {
        sessionId: generateSecureToken(), // Invalidate session
      });
    }

    res.clearCookie("accessToken", { httpOnly: true, sameSite: "strict" });

    res.status(200).json({
      success: true,
      message: "Logout successfully",
    });
  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// ================== SUPER ADMIN ACTION CONTROLLER =========
// ==========================================================
// ==========================================================
// ==========================================================

/**
 * Update Agency Status (Activate, Suspend, Ban)
 * PUT /api/super-admin/action/update-agency-status/:agencyId
 * Private access
 *
 * @async
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
exports.updateAgencyStatus = async (req, res) => {
  try {
    const { agencyId } = req.params;
    const { action, reason, durationInHours } = req.body;

    // Validate action
    if (!["ACTIVE", "SUSPEND", "BAN"].includes(action)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid action" });
    }

    // Find agency
    const agency = await Agency.findById(agencyId);
    if (!agency) {
      return res
        .status(404)
        .json({ success: false, message: "Agency not found" });
    }

    const now = new Date();
    let suspensionEnd = null;

    if (action === "ACTIVE") {
      agency.status = "ACTIVATED";
      agency.suspension = undefined;
    } else if (action === "SUSPEND") {
      agency.status = "SUSPENDED";
      suspensionEnd = new Date(
        now.getTime() + (durationInHours || 24) * 60 * 60 * 1000
      );
      agency.suspension = {
        type: "SHORT_TERM",
        reason: reason || null,
        startAt: now,
        endAt: suspensionEnd,
      };
    } else if (action === "BAN") {
      agency.status = "BANNED";
      agency.suspension = {
        type: "LONG_TERM",
        reason: reason || null,
        startAt: now,
        endAt: null,
      };
    }

    await agency.save();

    // Send email notification to agency
    try {
      await sendAgencyStatusUpdateEmail(
        agency.email,
        agency.agencyName,
        agency.status,
        reason,
        suspensionEnd
      );
    } catch (emailError) {
      console.error("Failed to send status update email:", emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json({
      success: true,
      message: `Agency ${action.toLowerCase()}ed successfully`,
      data: {
        agencyId: agency._id,
        status: agency.status,
        suspension: agency.suspension,
      },
    });
  } catch (error) {
    console.error("Error updating agency status:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * Update Agency Verification
 * PUT /api/super-admin/action/update-agency-verification/:agencyId
 * Private access
 *
 * @async
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
exports.updateAgencyVerification = async (req, res) => {
  try {
    const { agencyId } = req.params;
    const { isVerified } = req.body;

    const agency = await Agency.findById(agencyId);
    if (!agency) {
      return res.status(404).json({
        success: false,
        message: "Agency not found",
      });
    }

    agency.isVerified = isVerified;
    await agency.save();

    // Send email notification to agency
    try {
      await sendAgencyVerificationUpdateEmail(
        agency.email,
        agency.agencyName,
        agency.isVerified
      );
    } catch (emailError) {
      console.error("Failed to send verification update email:", emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json({
      success: true,
      message: `Agency ${isVerified ? "verified" : "unverified"} successfully`,
      data: {
        agencyId: agency._id,
        isVerified: agency.isVerified,
      },
    });
  } catch (error) {
    console.error("Error updating agency verification:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * Get all agencies
 * GET /api/super-admin/action/get-all-agencies
 * Public access
 *
 * @async
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */

exports.getAllAgencies = async (req, res) => {
  try {
    const agency = await Agency.find().select("-__v -password");
    res.status(200).json({
      success: true,
      message: "Agencies fetched successfully!",
      allAgencies: agency,
    });
  } catch (error) {
    console.error("Error fetching sellers:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * Get all packages
 * GET /api/super-admin/action/get-all-packages
 * Public access
 *
 * @async
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */

exports.getAllPackages = async (req, res) => {
  try {
    const package = await Package.find();
    res.status(200).json({
      success: true,
      message: "Packages fetched successfully!",
      allPackages: package,
    });
  } catch (error) {
    console.error("Error fetching packages:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * Get all users
 * GET /api/super-admin/action/get-all-users
 * Public access
 *
 * @async
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-__v -password");
    res.status(200).json({
      success: true,
      message: "Users fetched successfully!",
      allUsers: users,
    });
  } catch (error) {
    console.error("Error fetching sellers:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};
