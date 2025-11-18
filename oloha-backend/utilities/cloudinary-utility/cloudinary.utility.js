/**
 * @fileoverview Cloudinary utility for handling image and document uploads.
 * Supports:
 * - Image uploads (JPG, PNG, JPEG, WEBP)
 * - Document uploads (PDF, DOC, DOCX, XLS, XLSX)
 * - RAW upload support for non-image files
 * - Multer multi-field upload handling
 * - Folder-based organization for Oloha platform
 */

const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const path = require("path");

// ---------------------------------------------------------------------------
// CLOUDINARY CONFIGURATION
// ---------------------------------------------------------------------------

if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  throw new Error("Missing Cloudinary environment variables.");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ---------------------------------------------------------------------------
// ALLOWED FILE TYPES
// ---------------------------------------------------------------------------

const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
];

const allowedDocTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

// ---------------------------------------------------------------------------
// MULTER FILE FILTER
// ---------------------------------------------------------------------------

const fileFilter = (req, file, cb) => {
  if (!file) return cb(new Error("No file provided."), false);

  if (
    allowedImageTypes.includes(file.mimetype) ||
    allowedDocTypes.includes(file.mimetype)
  ) {
    return cb(null, true);
  }

  return cb(
    new Error(
      "Invalid file type. Allowed: JPG, PNG, WEBP, PDF, DOC, DOCX, XLS, XLSX."
    ),
    false
  );
};

// ---------------------------------------------------------------------------
// MULTER MEMORY STORAGE
// ---------------------------------------------------------------------------

const storage = multer.memoryStorage();

// ---------------------------------------------------------------------------
// MULTI-FIELD UPLOAD CONFIGURATION
// ---------------------------------------------------------------------------

exports.upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit
}).fields([
  { name: "agencyLogo", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
  { name: "profilePicture", maxCount: 1 },
  { name: "packageImages", maxCount: 20 },
  { name: "verificationDocs", maxCount: 10 }, // <-- added for agency legal docs
]);

// ---------------------------------------------------------------------------
// FOLDER ROUTING
// ---------------------------------------------------------------------------

const getFolderForUploadType = (type) => {
  const base = "Oloha";

  switch (type) {
    case "agencyLogo":
      return `${base}/agencies/logos`;
    case "coverImage":
      return `${base}/agencies/covers`;
    case "profilePicture":
      return `${base}/profilePictures`;
    case "packageImages":
      return `${base}/packages/images`;
    case "verificationDocs": // <-- pdf, doc, docx, etc.
      return `${base}/agencies/verificationDocs`;
    default:
      throw new Error(`Unsupported upload type: ${type}`);
  }
};

// ---------------------------------------------------------------------------
// FILE UPLOAD TO CLOUDINARY
// ---------------------------------------------------------------------------

/**
 * Uploads file (image or document) to Cloudinary.
 *
 * @param {object} file - Multer file object
 * @param {string} type - Upload context (agencyLogo, verificationDocs, etc.)
 * @param {string} [existingPublicId] - Optional existing Cloudinary public ID
 * @returns {Promise<{url: string, publicId: string}>}
 */
exports.uploadToCloudinary = async (file, type, existingPublicId = null) => {
  if (!file) throw new Error("No file provided for upload.");

  const folder = getFolderForUploadType(type);

  try {
    let publicId = existingPublicId;

    if (!publicId) {
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1e6);
      const ext = path.extname(file.originalname)?.replace(".", "") || "dat";

      publicId = `${folder}/${timestamp}-${random}.${ext}`;
    }

    // Determine resource type
    const resourceType = file.mimetype.startsWith("image/") ? "image" : "raw";

    // Convert buffer to base64
    const fileBuffer = `data:${file.mimetype};base64,${file.buffer.toString(
      "base64"
    )}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(fileBuffer, {
      public_id: publicId,
      resource_type: resourceType,
      overwrite: true,
      invalidate: true,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (err) {
    console.error("Cloudinary Upload Error:", err);
    throw new Error("Failed to upload file to Cloudinary.");
  }
};

// ---------------------------------------------------------------------------
// DELETE FILE FROM CLOUDINARY
// ---------------------------------------------------------------------------

/**
 * Deletes a file from Cloudinary.
 *
 * @param {string} publicId
 */
exports.deleteFromCloudinary = async (fileUrl) => {
  try {
    if (!fileUrl) {
      console.log("⚠️ No file URL provided for deletion");
      return;
    }

    console.log(`🔧 Processing Cloudinary URL: ${fileUrl}`);

    // Extract public_id from Cloudinary URL
    let publicId;

    if (fileUrl.includes("cloudinary.com")) {
      // Parse the Cloudinary URL to extract public_id
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split("/");

      // Find the index of 'upload' in the path
      const uploadIndex = pathParts.indexOf("upload");

      if (uploadIndex !== -1) {
        // The public_id starts after the version number (which is after 'upload')
        // Format: /upload/v1234567890/folder/filename.jpg
        const publicIdParts = pathParts.slice(uploadIndex + 2); // Skip 'upload' and version
        publicId = publicIdParts.join("/");

        // Remove file extension from public_id
        const lastDotIndex = publicId.lastIndexOf(".");
        if (lastDotIndex !== -1) {
          publicId = publicId.substring(0, lastDotIndex);
        }
      } else {
        // Fallback: try to extract using string manipulation
        const cloudinaryDomain = "res.cloudinary.com/";
        const domainIndex = fileUrl.indexOf(cloudinaryDomain);
        if (domainIndex !== -1) {
          const afterDomain = fileUrl.substring(
            domainIndex + cloudinaryDomain.length
          );
          const cloudNameEnd = afterDomain.indexOf("/");
          const afterCloudName = afterDomain.substring(cloudNameEnd + 1);
          const uploadIndex2 = afterCloudName.indexOf("upload/");
          if (uploadIndex2 !== -1) {
            const afterUpload = afterCloudName.substring(uploadIndex2 + 7); // 'upload/' is 7 chars
            const versionIndex = afterUpload.indexOf("/");
            if (versionIndex !== -1) {
              const afterVersion = afterUpload.substring(versionIndex + 1);
              const lastDotIndex = afterVersion.lastIndexOf(".");
              publicId =
                lastDotIndex !== -1
                  ? afterVersion.substring(0, lastDotIndex)
                  : afterVersion;
            }
          }
        }
      }
    }

    if (!publicId) {
      console.log("❌ Could not extract public_id from URL:", fileUrl);
      return;
    }

    console.log(`✅ Extracted public_id: ${publicId}`);

    // Determine resource type and delete
    try {
      // Try as image first
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
        invalidate: true,
      });

      if (result.result === "ok") {
        console.log(
          `✅ Successfully deleted image from Cloudinary: ${publicId}`
        );
        return;
      } else if (result.result === "not found") {
        // If image not found, try as raw file
        const rawResult = await cloudinary.uploader.destroy(publicId, {
          resource_type: "raw",
          invalidate: true,
        });

        if (rawResult.result === "ok") {
          console.log(
            `✅ Successfully deleted raw file from Cloudinary: ${publicId}`
          );
        } else {
          console.log(`❌ File not found in Cloudinary: ${publicId}`);
        }
      }
    } catch (deleteErr) {
      console.error(`❌ Error deleting from Cloudinary:`, deleteErr.message);
      throw deleteErr;
    }
  } catch (err) {
    console.error("❌ Cloudinary Deletion Error:", err);
    // Don't throw error here to allow the main deletion process to continue
    console.log(`⚠️ Continuing with other deletions despite Cloudinary error`);
  }
};
