/**
 * @fileoverview Unified Cloudinary utility module for secure image upload,
 * validation, folder structuring, and deletion. Supports:
 * - In-memory upload handling via Multer.
 * - MIME-level validation for JPG, PNG, and WEBP.
 * - Automatic Cloudinary folder selection and safe event title formatting.
 * - Safe replacement or upload of new images.
 * - Public ID extraction for deletion using robust URL parsing.
 *
 * @module utilities/cloudinaryUtility
 */

const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const path = require("path");
require("dotenv").config();

/* -------------------------------------------------------------------------- */
/*                         CLOUDINARY CONFIGURATION                            */
/* -------------------------------------------------------------------------- */

/**
 * Configure Cloudinary with secure environment variables.
 * All credentials must be stored in `.env` (never hardcode).
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
  api_key: process.env.CLOUDINARY_API_KEY?.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
});

/* -------------------------------------------------------------------------- */
/*                       MULTER MEMORY STORAGE + FILTER                       */
/* -------------------------------------------------------------------------- */

const storage = multer.memoryStorage();

/**
 * List of accepted MIME types for images.
 * @type {string[]}
 */
const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
];

/**
 * Validates uploaded files by MIME type.
 *
 * @param {Express.Request} req
 * @param {Express.Multer.File} file
 * @param {Function} cb
 * @returns {void}
 */
const fileFilter = (req, file, cb) => {
  if (!file) return cb(new Error("No file provided."), false);

  if (allowedImageTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  return cb(
    new Error(
      "Invalid file format. Only JPG, PNG, and WEBP files are allowed."
    ),
    false
  );
};

/**
 * Multer middleware for secure image uploads (in-memory).
 * Limits:
 * - 5MB max size per file.
 * - Hard cap on number of images per field.
 */
exports.upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).fields([{ name: "profilePicture", maxCount: 1 }]);

/**
 * Ensures a file upload exists in the request.
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @returns {void}
 */
exports.checkUploadedFiles = (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No files uploaded." });
  }
  next();
};

/* -------------------------------------------------------------------------- */
/*                         CLOUDINARY UPLOAD HANDLER                           */
/* -------------------------------------------------------------------------- */

/**
 * Uploads an in-memory file buffer to Cloudinary.
 *
 * @param {Express.Multer.File} file - In-memory uploaded file.
 * @param {"profilePicture" | "eventImage"} type - Upload category.
 * @param {string} [eventTitle="default"] - Used for folder naming.
 * @param {string|null} [existingPublicId=null] - If provided, overwrites existing asset.
 *
 * @returns {Promise<{url: string, publicId: string}>}
 */
exports.uploadToCloudinary = async (file, type, existingPublicId = null) => {
  if (!file) {
    throw new Error("File is missing or invalid.");
  }

  const baseFolder = "Oloha";
  let folder;

  // Select destination folder
  switch (type) {
    case "profilePicture":
      folder = `${baseFolder}/profilePictures`;
      break;

    default:
      throw new Error("Invalid upload type specified.");
  }

  try {
    let publicId = existingPublicId;

    if (!publicId) {
      const timestamp = Date.now();
      const randomNum = Math.round(Math.random() * 1e6);
      const ext = path.extname(file.originalname).replace(".", "") || "jpg"; // fallback

      publicId = `${folder}/${timestamp}-${randomNum}.${ext}`;
    }

    const fileBuffer = `data:${file.mimetype};base64,${file.buffer.toString(
      "base64"
    )}`;

    const result = await cloudinary.uploader.upload(fileBuffer, {
      public_id: publicId,
      resource_type: "image",
      overwrite: true,
      invalidate: true,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (err) {
    console.error("Cloudinary Upload Error:", err);
    throw new Error("Failed to upload image to Cloudinary.");
  }
};

/* -------------------------------------------------------------------------- */
/*                              DELETION UTILITY                               */
/* -------------------------------------------------------------------------- */

/**
 * Extracts a public_id from a Cloudinary URL.
 *
 * @param {string} url
 * @returns {string|null}
 */
const extractPublicIdFromUrl = (url) => {
  try {
    const regex = /\/image\/upload\/(?:v\d+\/)?([^.?]+)(\.[^.]+)?/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

/**
 * Deletes an image from Cloudinary.
 *
 * @param {string} fileUrlOrId - Can be a URL or a direct public ID.
 * @returns {Promise<boolean>} - True if deletion succeeded.
 */
exports.deleteFromCloudinary = async (fileUrlOrId) => {
  if (!fileUrlOrId) {
    throw new Error("Missing Cloudinary file identifier.");
  }

  try {
    let publicId = fileUrlOrId;

    if (fileUrlOrId.startsWith("http")) {
      publicId = extractPublicIdFromUrl(fileUrlOrId);
      if (!publicId) {
        console.error("Unable to extract public_id from URL:", fileUrlOrId);
        return false;
      }
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });

    return result?.result === "ok";
  } catch (err) {
    console.error("Cloudinary Deletion Error:", err);
    throw new Error("Failed to delete file from Cloudinary.");
  }
};
