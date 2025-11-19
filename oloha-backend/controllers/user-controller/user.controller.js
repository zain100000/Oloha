/**
 * @file User controller
 * @description Controller module for managing User authentication and profile operations with encrypted JWTs.
 * Supports:
 * - Registration with password validation and secure Cloudinary upload.
 * - Login system with AES-256-GCM encrypted JWTs, session tracking, and account lockout on repeated failed attempts.
 * - Retrieval of User details by ID.
 * - Logout functionality with session invalidation.
 *
 * @module controllers/userController
 */

const bcrypt = require("bcrypt");
const axios = require("axios");
const User = require("../../models/user-model/user.model");
const Booking = require("../../models/booking-model/Booking.model");
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
  sendUserDeletionConfirmationEmail,
} = require("../../helpers/email-helper/email.helper");

/**
 * Register a new User
 * POST /api/user/signup-user
 * Public access
 *
 * @async
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
exports.registerUser = async (req, res) => {
  let uploadedFileUrl = null;
  try {
    const { userName, email, password, phone, address } = req.body;

    if (!userName || !email || !password || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: "User name, email, password, phone and address are required",
      });
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
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

    const user = new User({
      userName,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      address,
      profilePicture: userProfileImageUrl,
      role: "USER",
      travelHistory: [],
      bookings: [],
      lastLogin: null,
      loginAttempts: 0,
      lockUntil: null,
      sessionId: null,
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    if (uploadedFileUrl) {
      try {
        await deleteFromCloudinary(uploadedFileUrl);
      } catch (cloudErr) {
        console.error("Failed to rollback Cloudinary upload:", cloudErr);
      }
    }

    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * User login with AES-256-GCM encrypted JWT
 * POST /api/user/signin-user
 * Public access
 *
 * @async
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${remaining} minutes.`,
      });
    }

    if (user.lockUntil && user.lockUntil <= Date.now()) {
      user.loginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 3) {
        user.lockUntil = Date.now() + 30 * 60 * 1000;
      }
      await user.save();

      const message =
        user.lockUntil && user.lockUntil > Date.now()
          ? "Too many failed login attempts. Account locked for 30 minutes."
          : "Invalid credentials";

      return res.status(401).json({
        success: false,
        message,
        attempts: user.loginAttempts,
      });
    }

    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    user.sessionId = generateSecureToken();
    await user.save();

    const payload = {
      role: "USER",
      user: { id: user._id.toString(), email: user.email },
      sessionId: user.sessionId,
    };

    const encryptedToken = generateEncryptedToken(payload);

    res.cookie("accessToken", encryptedToken, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "User login successfully!",
      user: {
        id: user._id,
        userName: user.userName,
        email: user.email,
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
 * Get User by ID
 * GET /api/user/get-user-by-id/:userId
 * Private access
 *
 * @async
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select("-password -__v")
      .populate("bookings")
      .populate("travelHistory.packageId");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User fetched successfully",
      user,
    });
  } catch (error) {
    console.error("Fetch User Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Update User by ID
 * PATCH /api/user/update-user-by-id/:userId
 * Private access
 *
 * @async
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
exports.updateUserById = async (req, res) => {
  let uploadedFileUrl = null;
  try {
    const { userId } = req.params;

    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (req.user.id !== userId && req.user.role !== "SUPERADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update your own profile.",
      });
    }

    const editableFields = ["userName", "phone"];
    editableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    if (req.files?.profilePicture) {
      const newProfileImage = req.files.profilePicture[0];
      let publicId = null;

      if (user.profilePicture) {
        const matches = user.profilePicture.match(
          /\/(?:image|raw)\/upload\/(?:v\d+\/)?([^?]+)/
        );
        if (matches && matches.length >= 2) {
          publicId = matches[1].replace(/\.[^.]+$/, "");
        }
      }

      const result = await uploadToCloudinary(
        newProfileImage,
        "profilePicture",
        publicId
      );
      user.profileImage = result.url;
      uploadedFileUrl = result.url;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    if (uploadedFileUrl) {
      try {
        await deleteFromCloudinary(uploadedFileUrl);
      } catch (cloudErr) {
        console.error("Failed to rollback Cloudinary upload:", cloudErr);
      }
    }

    console.error("Update User Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Delete User by ID
 * DELETE /api/user/delete-user-by-id/:userId
 * Private access
 *
 * @async
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */

exports.deleteUserById = async (req, res) => {
  const { userId } = req.params;

  if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      success: false,
      message: "Invalid User ID format",
    });
  }

  try {
    const user = await User.findById(userId)
      .populate("travelHistory.packageId")
      .populate("bookings");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (req.user.role === "USER" && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only delete your own account.",
      });
    }

    try {
      const emailSent = await sendUserDeletionConfirmationEmail(
        user.email,
        user.userName
      );
      if (!emailSent) console.warn("❌ Email not sent to", user.email);
    } catch (err) {
      console.warn("❌ Error sending deletion email:", err.message);
    }

    const cloudinaryFiles = [];

    if (user.profilePicture) {
      cloudinaryFiles.push(user.profilePicture);
    }

    if (user.travelHistory?.length > 0) {
      for (const travel of user.travelHistory) {
        if (travel.packageId) {
          await Package.findByIdAndUpdate(
            travel.packageId,
            { $pull: { bookings: { $in: user.bookings } } },
            { new: true }
          );
        }
      }
    }

    if (user.bookings?.length > 0) {
      for (const booking of user.bookings) {
        if (booking.package) {
          await Package.findByIdAndUpdate(booking.package, {
            $inc: { availableSlots: booking.numberOfTravelers || 1 },
            $pull: { bookings: booking._id },
          });
        }

        await Booking.findByIdAndDelete(booking._id);
      }
    }

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

    await User.findByIdAndDelete(userId);

    if (req.user.id === userId) {
      res.clearCookie("accessToken", { httpOnly: true, sameSite: "strict" });
    }

    return res.status(200).json({
      success: true,
      message: "User account and all related data deleted permanently.",
    });
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error. Unable to delete user.",
      error: error.message,
    });
  }
};

/**
 * Logout User
 * POST /api/user/logout-user
 * Private access
 *
 * @async
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
exports.logoutUser = async (req, res) => {
  try {
    if (req.user?.id) {
      await User.findByIdAndUpdate(req.user.id, {
        sessionId: generateSecureToken(),
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

/**
 * @function updateUserLocation
 * @description Updates the user's live location and also replaces the main address field with the resolved full address.
 * PATCH /api/user/update-location
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.updateUserLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude } = req.body;

    // Validate
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      isNaN(latitude) ||
      isNaN(longitude)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude and longitude are required",
      });
    }

    // Reverse Geocoding (OpenStreetMap – no key required)
    const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;

    const geoResponse = await axios.get(geoUrl, {
      headers: { "User-Agent": "Oloha-App/1.0" },
    });

    const fetchedAddress =
      geoResponse?.data?.display_name || "Unknown Location";

    const updatePayload = {
      lastKnownLocation: {
        latitude,
        longitude,
        address: fetchedAddress,
      },
      address: fetchedAddress, // sync root address
      updatedAt: new Date(),
    };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updatePayload },
      { new: true }
    ).select("-password -__v");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Location updated successfully",
      location: updatedUser,
    });
  } catch (error) {
    console.error("Update Location Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating location",
    });
  }
};
