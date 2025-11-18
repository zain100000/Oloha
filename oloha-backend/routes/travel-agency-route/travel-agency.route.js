/**
 * @fileoverview Express routes for Travel Agency authentication and profile management
 * @module routes/travelAgencyRoutes
 * @description Provides endpoints for:
 *  - Travel Agency registration
 *  - Login with AES-256-GCM encrypted JWT
 *  - Fetching Travel Agency details by ID
 *  - Logout with session invalidation
 */

const express = require("express");
const router = express.Router();

const travelAgencyController = require("../../controllers/travel-agency-controller/travel-agency.controller");
const {
  encryptedAuthMiddleware,
  authLimiter,
} = require("../../middlewares/auth-middleware/auth.middleware");
const cloudinaryUtility = require("../../utilities/cloudinary-utility/cloudinary.utility");

/**
 * @description Registers a new Travel Agency with optional profile picture upload.
 */
router.post(
  "/signup-agency",
  cloudinaryUtility.upload,
  travelAgencyController.registerAgency
);

/**
 * @description Logs in a Travel Agency and returns AES-256-GCM encrypted JWT.
 */
router.post("/signin-agency", authLimiter, travelAgencyController.loginAgency);

/**
 * @description Retrieves Travel Agency details by ID (excluding password and internal fields).
 */
router.get(
  "/get-agency-by-id/:agencyId",
  encryptedAuthMiddleware,
  travelAgencyController.getAgencyById
);

/**
 * @description Update Travel Agency details by ID
 */
router.patch(
  "/update-agency-by-id/:agencyId",
  encryptedAuthMiddleware,
  cloudinaryUtility.upload,
  travelAgencyController.updateTravelAgency
);

/**
 * @description Delete Travel Agency details by ID
 */
router.delete(
  "/delete-agency/:agencyId",
  encryptedAuthMiddleware,
  travelAgencyController.deleteAgency
);

/**
 * @description Logs out a Travel Agency, invalidates the session, and clears JWT cookie.
 */
router.post(
  "/logout-agency",
  encryptedAuthMiddleware,
  travelAgencyController.loginAgency
);

module.exports = router;
