const { Business } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { logAction } = require('../services/auditService');

/**
 * @desc   Get business profile of current applicant
 * @route  GET /api/business
 * @access Private (Applicant / Admin)
 */
const getMyBusiness = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      return ApiResponse.error(res, 'No business establishment profile found for this account', 404);
    }
    return ApiResponse.success(res, business, 'Business retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Create or register a new business establishment
 * @route  POST /api/business
 * @access Private (Applicant)
 */
const createBusiness = async (req, res, next) => {
  try {
    const businessData = {
      ...req.body,
      owner: req.user._id,
    };

    const business = await Business.create(businessData);

    await logAction({
      user: req.user._id,
      action: 'BUSINESS_CREATED',
      entityType: 'Business',
      entityId: business._id,
      description: `Establishment '${business.businessName}' registered`,
    });

    return ApiResponse.success(res, business, 'Business establishment registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update business profile
 * @route  PUT /api/business/:id
 * @access Private (Applicant / Admin)
 */
const updateBusiness = async (req, res, next) => {
  try {
    let business = await Business.findById(req.params.id);

    if (!business) {
      return ApiResponse.error(res, 'Business not found', 404);
    }

    // Ensure applicant owns this business (unless admin)
    if (req.user.role !== 'admin' && business.owner.toString() !== req.user._id.toString()) {
      return ApiResponse.error(res, 'Not authorized to update this business establishment', 403);
    }

    business = await Business.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    await logAction({
      user: req.user._id,
      action: 'BUSINESS_UPDATED',
      entityType: 'Business',
      entityId: business._id,
      description: `Establishment '${business.businessName}' details updated`,
    });

    return ApiResponse.success(res, business, 'Business details updated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyBusiness, createBusiness, updateBusiness };
