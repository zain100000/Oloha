/**
 * @file Travel Agency Controller
 * @description Controller module for managing Travel Agency authentication, profile, and secure operations.
 * Supports:
 * - Registration with password validation and optional logo upload.
 * - Login system with AES-256-GCM encrypted JWTs and session tracking.
 * - Retrieval of agency profile by ID.
 * - Logout with session invalidation.
 *
 * @module controllers/travelAgencyController
 */

const bcrypt = require("bcrypt");
const TravelAgency = require("../../models/travel-agency-model/travel-agency.model");
const Booking = require("../../models/booking-model/Booking.model");
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
  sendAgencyDeletionConfirmationEmail,
} = require("../../helpers/email-helper/email.helper");

/**
 * Register a new Travel Agency
 * POST /api/travel-agency/signup-agency
 * Public access
 *
 * @async
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.registerAgency = async (req, res) => {
  let uploadedFiles = [];

  try {
    const { agencyName, email, password, contactNumber, address, description } =
      req.body;

    if (!agencyName || !email || !password || !contactNumber) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing" });
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters, include uppercase, lowercase, number, and special character",
      });
    }

    const existingAgency = await TravelAgency.findOne({
      email: email.toLowerCase(),
    });
    if (existingAgency) {
      return res
        .status(409)
        .json({ success: false, message: "Email already in use" });
    }

    let agencyLogo = null;
    if (req.files?.agencyLogo) {
      const uploadResult = await uploadToCloudinary(
        req.files.agencyLogo[0],
        "agencyLogo"
      );
      agencyLogo = uploadResult.url;
      uploadedFiles.push(agencyLogo);
    }

    let coverImage = null;
    if (req.files?.coverImage) {
      const uploadResult = await uploadToCloudinary(
        req.files.coverImage[0],
        "coverImage"
      );
      coverImage = uploadResult.url;
      uploadedFiles.push(coverImage);
    }

    const verificationDocs = [];
    if (req.files?.verificationDocs) {
      for (const file of req.files.verificationDocs) {
        const uploadResult = await uploadToCloudinary(file, "verificationDocs");
        verificationDocs.push({
          docType: file.mimetype,
          docUrl: uploadResult.url,
          uploadedAt: new Date(),
        });
        uploadedFiles.push(uploadResult.url);
      }
    }

    const hashedPassword = await hashPassword(password);

    const agency = new TravelAgency({
      agencyName,
      email: email.toLowerCase(),
      password: hashedPassword,
      contactNumber,
      address: address || null,
      description: description || null,
      agencyLogo,
      coverImage,
      verificationDocs,
      isVerified: false,
      status: "PENDING",
      role: "AGENCY",
      lastLogin: null,
      loginAttempts: 0,
      lockUntil: null,
      sessionId: null,
    });

    await agency.save();

    res.status(201).json({
      success: true,
      message: "Agency registered successfully",
    });
  } catch (error) {
    for (const url of uploadedFiles) {
      try {
        await deleteFromCloudinary(url);
      } catch (_) {}
    }
    console.error("Error registering agency:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * Travel Agency login with AES-256-GCM encrypted JWT
 * POST /api/travel-agency/signin-agency
 * Public access
 *
 * @async
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.loginAgency = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, message: "Email and password required" });

    const agency = await TravelAgency.findOne({ email: email.toLowerCase() });
    if (!agency)
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });

    if (agency.lockUntil && agency.lockUntil > Date.now()) {
      const remaining = Math.ceil((agency.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${remaining} minutes.`,
      });
    }

    if (agency.lockUntil && agency.lockUntil <= Date.now()) {
      agency.loginAttempts = 0;
      agency.lockUntil = null;
      await agency.save();
    }

    // Prevent login if account is pending approval
    if (agency.status === "PENDING") {
      return res.status(403).json({
        success: false,
        message:
          "Your account is pending approval. Please wait for admin verification.",
      });
    }

    // Check banned accounts
    if (agency.status === "BANNED") {
      return res.status(403).json({
        success: false,
        message: "Cannot login, your account has been permanently banned.",
      });
    }

    // Check suspended accounts
    if (agency.status === "SUSPENDED") {
      const now = new Date();
      if (agency.suspension?.endAt && now < agency.suspension.endAt) {
        return res.status(403).json({
          success: false,
          message: "Your account is temporarily suspended.",
        });
      } else {
        agency.status = "ACTIVE";
        agency.suspension = null;
        await agency.save();
      }
    }

    const isMatch = await bcrypt.compare(password, agency.password);

    if (!isMatch) {
      agency.loginAttempts += 1;
      if (agency.loginAttempts >= 3) {
        agency.lockUntil = Date.now() + 30 * 60 * 1000; // Lock 30 minutes
      }
      await agency.save();

      const message =
        agency.lockUntil && agency.lockUntil > Date.now()
          ? "Too many failed login attempts. Account locked for 30 minutes."
          : "Invalid credentials";

      return res.status(401).json({
        success: false,
        message,
        attempts: agency.loginAttempts,
      });
    }

    // Update session
    agency.loginAttempts = 0;
    agency.lockUntil = null;
    agency.lastLogin = new Date();
    agency.sessionId = generateSecureToken();
    await agency.save();

    const payload = {
      role: "AGENCY",
      user: { id: agency._id, email: agency.email },
      sessionId: agency.sessionId,
    };
    const encryptedToken = generateEncryptedToken(payload);

    res.cookie("accessToken", encryptedToken, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Login successfully",
      agency: {
        id: agency._id,
        agencyName: agency.agencyName,
        email: agency.email,
      },
      token: encryptedToken,
      expiresIn: 24 * 60 * 60,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * Get Travel Agency by ID
 * GET /api/travel-agency/get-agency-by-id/:agencyId
 * Private access
 *
 * @async
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getAgencyById = async (req, res) => {
  try {
    const { agencyId } = req.params;
    const agency = await TravelAgency.findById(agencyId)
      .select("-password -loginAttempts -lockUntil -sessionId -__v")
      .populate({
        path: "packages",
        select: "-__v", // Exclude version key, include all other fields
        // If you want to populate nested fields in packages, you can add more here
        // For example, if packages have nested bookings:
        // populate: {
        //   path: "bookings",
        //   select: "bookingReference status totalAmount"
        // }
      });

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: "Agency not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Agency fetched successfully",
      agency,
    });
  } catch (error) {
    console.error("Fetch Agency Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Update Travel Agency by ID
 * PATCH /api/travel-agency/update-agency-by-id/:agencyId
 * Private access
 *
 * @async
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.updateTravelAgency = async (req, res) => {
  const { agencyId } = req.params;

  if (!agencyId || !agencyId.match(/^[0-9a-fA-F]{24}$/)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid Agency ID" });
  }

  try {
    const agency = await TravelAgency.findById(agencyId);

    if (!agency) {
      return res
        .status(404)
        .json({ success: false, message: "Agency not found." });
    }

    // Editable fields by agency
    const editableFields = [
      "agencyName",
      "description",
      "contactNumber",
      "address",
    ];

    editableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        agency[field] = req.body[field];
      }
    });

    // Handle agencyLogo upload
    if (req.files?.agencyLogo) {
      const newLogo = req.files.agencyLogo[0];
      let publicId = null;

      if (agency.agencyLogo) {
        const matches = agency.agencyLogo.match(
          /\/(?:image|raw)\/upload\/(?:v\d+\/)?([^?]+)/
        );
        if (matches && matches.length >= 2) {
          publicId = matches[1].replace(/\.[^.]+$/, "");
        }
      }

      const result = await uploadToCloudinary(newLogo, "agencyLogo", publicId);
      agency.agencyLogo = result.url;
    }

    // Handle coverImage upload
    if (req.files?.coverImage) {
      const newCover = req.files.coverImage[0];
      let publicId = null;

      if (agency.coverImage) {
        const matches = agency.coverImage.match(
          /\/(?:image|raw)\/upload\/(?:v\d+\/)?([^?]+)/
        );
        if (matches && matches.length >= 2) {
          publicId = matches[1].replace(/\.[^.]+$/, "");
        }
      }

      const result = await uploadToCloudinary(newCover, "coverImage", publicId);
      agency.coverImage = result.url;
    }

    // Optionally allow agency to upload verification documents
    if (req.files?.verificationDocs) {
      for (const file of req.files.verificationDocs) {
        const uploadResult = await uploadToCloudinary(file, "verificationDocs");
        agency.verificationDocs.push({
          docType: file.mimetype,
          docUrl: uploadResult.url,
          uploadedAt: new Date(),
        });
      }
    }

    await agency.save();

    return res.status(200).json({
      success: true,
      message: "Agency updated successfully.",
      agency,
    });
  } catch (err) {
    console.error("❌ Error updating agency:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * Delete Travel Agency by ID
 * DELETE /api/travel-agency/delete-agency/:agencyId
 * Private access
 *
 * @async
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.deleteAgency = async (req, res) => {
  const { agencyId } = req.params;

  if (!agencyId || !agencyId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      success: false,
      message: "Invalid Agency ID format",
    });
  }

  try {
    // Fetch agency with related packages and bookings
    const agency = await TravelAgency.findById(agencyId)
      .populate("packages")
      .populate("bookings");

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: "Agency not found",
      });
    }

    // 1️⃣ Send confirmation email first
    try {
      const emailSent = await sendAgencyDeletionConfirmationEmail(
        agency.email,
        agency.agencyName
      );
      if (!emailSent) console.warn("❌ Email not sent to", agency.email);
    } catch (err) {
      console.warn("❌ Error sending deletion email:", err.message);
    }

    // 2️⃣ Collect Cloudinary files
    const cloudinaryFiles = [];
    if (agency.agencyLogo) cloudinaryFiles.push(agency.agencyLogo);
    if (agency.coverImage) cloudinaryFiles.push(agency.coverImage);
    if (agency.verificationDocs?.length > 0) {
      agency.verificationDocs.forEach((doc) =>
        cloudinaryFiles.push(doc.docUrl)
      );
    }

    // Add package images
    if (agency.packages?.length > 0) {
      for (const pkg of agency.packages) {
        if (pkg.images?.length > 0) {
          pkg.images.forEach((img) => cloudinaryFiles.push(img));
        }
        await Package.findByIdAndDelete(pkg._id);
      }
    }

    // Delete bookings
    if (agency.bookings?.length > 0) {
      for (const booking of agency.bookings) {
        await Booking.findByIdAndDelete(booking._id);
      }
    }

    // 3️⃣ Delete files from Cloudinary
    for (const fileUrl of cloudinaryFiles) {
      try {
        await deleteFromCloudinary(fileUrl);
      } catch (err) {
        console.warn(
          `⚠️ Failed to delete Cloudinary file: ${fileUrl}`,
          err.message
        );
      }
    }

    // 4️⃣ Delete agency from DB
    await TravelAgency.findByIdAndDelete(agencyId);

    // 5️⃣ Clear access token cookie
    res.clearCookie("accessToken", { httpOnly: true, sameSite: "strict" });

    return res.status(200).json({
      success: true,
      message: "Agency account and all related data deleted permanently.",
    });
  } catch (err) {
    console.error("❌ Error deleting agency:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error. Unable to delete agency.",
      error: err.message,
    });
  }
};

/**
 * Logout Travel Agency
 * POST /api/travel-agency/logout
 * Private access
 *
 * @async
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.logoutAgency = async (req, res) => {
  try {
    if (req.user?.id) {
      await TravelAgency.findByIdAndUpdate(req.user.id, {
        sessionId: generateSecureToken(),
      });
    }
    res.clearCookie("accessToken", { httpOnly: true, sameSite: "strict" });
    res.status(200).json({ success: true, message: "Logout successful" });
  } catch (error) {
    console.error("Logout Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// ================== AGENCY ACTION CONTROLLER ==============
// ==========================================================
// ==========================================================
// ==========================================================

/**
 * Update Package Status (
 * PUT /api/agency/action/update-package-status/:packageId
 * Private access
 *
 * @async
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
exports.updatePackageStatus = async (req, res) => {
  try {
    const { packageId } = req.params;
    const { action } = req.body;

    // Validate action
    if (!["ACTIVE", "INACTIVE"].includes(action)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid action" });
    }

    // Find package
    const package = await Package.findById(packageId);
    if (!package) {
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });
    }

    if (action === "ACTIVE") {
      package.status = "ACTIVATED";
    } else if (action === "INACTIVE") {
      package.status = "INACTIVATED";
    }

    await package.save();

    res.status(200).json({
      success: true,
      message: `Package ${action.toLowerCase()}ed successfully`,
      status: {
        packageId: package._id,
        status: package.status,
      },
    });
  } catch (error) {
    console.error("Error updating agency status:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};
