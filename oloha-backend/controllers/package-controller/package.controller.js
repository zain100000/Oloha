/**
 * @file Travel Package Controller
 * @description Controller module for managing Travel Package operations by agencies.
 * Supports:
 * - Package creation with image uploads and itinerary management
 * - Package retrieval by ID and agency
 * - Package updates with image management
 * - Package deletion with cleanup
 *
 * @module controllers/packageController
 */

const Package = require("../../models/package-model/Package.model");
const Agency = require("../../models/travel-agency-model/travel-agency.model");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../../utilities/cloudinary-utility/cloudinary.utility");

/**
 * Create a new Travel Package
 * POST /api/package/agency/create-package
 * Private access (Agency only)
 *
 * @async
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.createPackage = async (req, res) => {
  let uploadedFiles = [];

  try {
    const {
      packageTitle,
      description,
      price,
      discount,
      duration,
      availableSlots,
      category,
      itinerary,
    } = req.body;

    if (!packageTitle || !price || !availableSlots) {
      return res.status(400).json({
        success: false,
        message: "Package title, price, and available slots are required",
      });
    }

    if (price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be greater than 0",
      });
    }

    if (availableSlots <= 0) {
      return res.status(400).json({
        success: false,
        message: "Available slots must be greater than 0",
      });
    }

    if (discount && (discount < 0 || discount > 100)) {
      return res.status(400).json({
        success: false,
        message: "Discount must be between 0 and 100",
      });
    }

    let parsedItinerary = [];
    if (itinerary) {
      try {
        parsedItinerary =
          typeof itinerary === "string" ? JSON.parse(itinerary) : itinerary;

        if (!Array.isArray(parsedItinerary)) {
          return res.status(400).json({
            success: false,
            message: "Itinerary must be an array",
          });
        }

        for (const day of parsedItinerary) {
          if (!day.day || !day.activities) {
            return res.status(400).json({
              success: false,
              message:
                "Each itinerary day must have 'day' and 'activities' fields",
            });
          }
        }
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: "Invalid itinerary format",
        });
      }
    }

    const agencyId = req.user.id;
    const agency = await Agency.findById(agencyId);

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: "Agency not found",
      });
    }

    if (agency.status !== "ACTIVATED") {
      return res.status(403).json({
        success: false,
        message: "Your agency account is not active. Cannot create packages.",
      });
    }

    const packageImages = [];
    if (req.files?.packageImages) {
      for (const file of req.files.packageImages) {
        const uploadResult = await uploadToCloudinary(file, "packageImages");
        packageImages.push(uploadResult.url);
        uploadedFiles.push(uploadResult.url);
      }
    }

    const package = new Package({
      packageTitle,
      description: description || "",
      packageImages,
      price: Number(price),
      discount: discount ? Number(discount) : 0,
      duration: duration || "",
      itinerary: parsedItinerary,
      availableSlots: Number(availableSlots),
      category: category || "TOUR",
      agency: agencyId,
      bookings: [],
      status: "PENDING",
    });

    await package.save();

    agency.packages.push(package._id);
    await agency.save();

    res.status(201).json({
      success: true,
      message: "Package created successfully",
      package: {
        id: package._id,
        packageTitle: package.packageTitle,
        price: package.price,
        availableSlots: package.availableSlots,
        category: package.category,
        status: package.status,
        packageImages: package.packageImages,
      },
    });
  } catch (error) {
    for (const url of uploadedFiles) {
      try {
        await deleteFromCloudinary(url);
      } catch (_) {}
    }

    console.error("Error creating package:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Get Package by ID
 * GET /api/package/agency/get-package-by-id/:packageId
 * Private access
 *
 * @async
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getPackageById = async (req, res) => {
  try {
    const { packageId } = req.params;

    if (!packageId || !packageId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Package ID",
      });
    }

    const package = await Package.findById(packageId)
      .populate("agency", "agencyName email contactNumber isVerified")
      .populate("bookings", "bookingReference status totalAmount");

    if (!package) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    const agencyId = req.user.id;
    if (package.agency._id.toString() !== agencyId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own packages.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Package fetched successfully",
      package,
    });
  } catch (error) {
    console.error("Fetch Package Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Update Package by ID
 * PATCH /api/package/agency/update-package-by-id/:packageId
 * Private access
 *
 * @async
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.updatePackage = async (req, res) => {
  let uploadedFiles = [];

  try {
    const { packageId } = req.params;

    if (!packageId || !packageId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Package ID",
      });
    }

    const package = await Package.findById(packageId);
    if (!package) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    const agencyId = req.user.id;
    if (package.agency.toString() !== agencyId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update your own packages.",
      });
    }

    const editableFields = [
      "packageTitle",
      "description",
      "price",
      "discount",
      "duration",
      "availableSlots",
      "category",
      "itinerary",
      "status",
    ];

    editableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "itinerary" && typeof req.body[field] === "string") {
          try {
            package[field] = JSON.parse(req.body[field]);
          } catch (parseError) {
            return res.status(400).json({
              success: false,
              message: "Invalid itinerary format",
            });
          }
        } else {
          package[field] = req.body[field];
        }
      }
    });

    if (req.body.price !== undefined && req.body.price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be greater than 0",
      });
    }

    if (req.body.availableSlots !== undefined && req.body.availableSlots < 0) {
      return res.status(400).json({
        success: false,
        message: "Available slots cannot be negative",
      });
    }

    if (
      req.body.discount !== undefined &&
      (req.body.discount < 0 || req.body.discount > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Discount must be between 0 and 100",
      });
    }

    if (req.files?.packageImages) {
      for (const file of req.files.packageImages) {
        const uploadResult = await uploadToCloudinary(file, "packageImages");
        package.packageImages.push(uploadResult.url);
        uploadedFiles.push(uploadResult.url);
      }
    }

    await package.save();

    res.status(200).json({
      success: true,
      message: "Package updated successfully",
      package,
    });
  } catch (error) {
    for (const url of uploadedFiles) {
      try {
        await deleteFromCloudinary(url);
      } catch (_) {}
    }

    console.error("Update Package Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Delete Package by ID
 * DELETE /api/package/agency/delete-package/:packageId
 * Private access
 *
 * @async
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.deletePackage = async (req, res) => {
  try {
    const { packageId } = req.params;

    if (!packageId || !packageId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Package ID format",
      });
    }

    const package = await Package.findById(packageId);
    if (!package) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === "AGENCY" && package.agency.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only delete your own packages.",
      });
    }

    if (package.bookings && package.bookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete package with active bookings",
      });
    }

    if (package.packageImages?.length > 0) {
      for (const imageUrl of package.packageImages) {
        try {
          await deleteFromCloudinary(imageUrl);
        } catch (err) {
          console.warn(
            `Failed to delete Cloudinary image: ${imageUrl}`,
            err.message
          );
        }
      }
    }

    if (userRole === "SUPERADMIN" || package.agency.toString() === userId) {
      await Agency.findByIdAndUpdate(package.agency, {
        $pull: { packages: packageId },
      });
    }

    await Package.findByIdAndDelete(packageId);

    res.status(200).json({
      success: true,
      message: "Package deleted successfully",
    });
  } catch (error) {
    console.error("Delete Package Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
