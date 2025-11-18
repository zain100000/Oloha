/**
 * @fileoverview Express routes for Package management by Agencies
 * @module routes/packageRoutes
 * @description Provides endpoints for:
 *  - Package creation with image uploads
 *  - Package retrieval by ID and agency
 *  - Package updates with image management
 *  - Package deletion with cleanup
 */

const express = require("express");
const router = express.Router();
const packageController = require("../../controllers/package-controller/package.controller");
const {
  encryptedAuthMiddleware,
} = require("../../middlewares/auth-middleware/auth.middleware");
const cloudinaryUtility = require("../../utilities/cloudinary-utility/cloudinary.utility");

// ================== AGENCY PACKAGE MANAGEMENT ROUTES =======
// ===========================================================
// ===========================================================
// ===========================================================

/**
 * @description Creates a new travel package with image uploads
 * @route POST /api/package/agency/create-package
 * @access Private (Agency only)
 */
router.post(
  "/agency/create-package",
  encryptedAuthMiddleware,
  cloudinaryUtility.upload,
  packageController.createPackage
);

/**
 * @description Retrieves a specific package by ID
 * @route GET /api/package/agency/get-package-by-id/:packageId
 * @access Private (Agency only)
 */
router.get(
  "/agency/get-package-by-id/:packageId",
  encryptedAuthMiddleware,
  packageController.getPackageById
);

/**
 * @description Updates an existing package with optional image uploads
 * @route PATCH /api/package/agency/update-package-by-id/:packageId
 * @access Private (Agency only)
 */
router.patch(
  "/agency/update-package-by-id/:packageId",
  encryptedAuthMiddleware,
  cloudinaryUtility.upload,
  packageController.updatePackage
);

/**
 * @description Deletes a package and cleans up associated images
 * @route DELETE /api/package/agency/delete-package/:packageId
 * @access Private (Agency only)
 */
router.delete(
  "/agency/delete-package/:packageId",
  encryptedAuthMiddleware,
  packageController.deletePackage
);

module.exports = router;
