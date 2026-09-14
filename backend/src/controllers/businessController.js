const { Business, Instrument } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { logAction } = require('../services/auditService');
const geocodingService = require('../services/geocodingService');

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

    // Handle coordinates from either coordinates or location.coordinates
    let coords = req.body.coordinates;
    if (!coords && req.body.location && Array.isArray(req.body.location.coordinates)) {
      coords = req.body.location.coordinates;
    }

    if (coords && Array.isArray(coords) && coords.length === 2) {
      const lng = parseFloat(coords[0]);
      const lat = parseFloat(coords[1]);
      if (!isNaN(lng) && !isNaN(lat) && !(lng === 0 && lat === 0)) {
        req.body.location = {
          type: 'Point',
          coordinates: [lng, lat],
        };
        req.body.isLocationConfirmed = true;
      }
    } else if (
      !req.body.location?.coordinates &&
      (req.body.district || req.body.city || req.body.pincode || business.district || business.pincode)
    ) {
      // Auto fallback geocoding
      try {
        const geo = await geocodingService.geocodeAddress({
          addressLine1: req.body.addressLine1 || business.addressLine1 || req.body.address || business.address,
          locality: req.body.locality || business.locality,
          city: req.body.city || business.city,
          district: req.body.district || business.district,
          state: req.body.state || business.state,
          pincode: req.body.pincode || business.pincode,
        });
        if (geo && geo.latitude && geo.longitude) {
          req.body.location = {
            type: 'Point',
            coordinates: [geo.longitude, geo.latitude],
          };
          req.body.isLocationConfirmed = true;
        }
      } catch (gErr) {
        console.warn('[UpdateBusiness] Geocode warning:', gErr.message);
      }
    }

    business = await Business.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Cascade updated location to all instruments under this business using business address
    if (business.location?.coordinates && business.location.coordinates.length === 2) {
      await Instrument.updateMany(
        { business: business._id, useBusinessAddress: true },
        {
          $set: {
            location: business.location,
            isLocationConfirmed: business.isLocationConfirmed,
            'verificationAddress.addressLine1': business.addressLine1 || business.address,
            'verificationAddress.addressLine2': business.addressLine2 || '',
            'verificationAddress.locality': business.locality || '',
            'verificationAddress.landmark': business.landmark || '',
            'verificationAddress.city': business.city || '',
            'verificationAddress.district': business.district || '',
            'verificationAddress.state': business.state || '',
            'verificationAddress.country': business.country || 'India',
            'verificationAddress.pincode': business.pincode || '',
          },
        }
      );
    }

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

/**
 * @desc   Update business address and verification location coordinates
 * @route  PUT /api/business/address
 * @access Private (Applicant / Admin)
 */
const updateBusinessAddress = async (req, res, next) => {
  try {
    let business = await Business.findOne({ owner: req.user._id });
    if (!business && req.user.role === 'admin' && req.body.businessId) {
      business = await Business.findById(req.body.businessId);
    }
    if (!business) {
      return ApiResponse.error(res, 'Business not found', 404);
    }

    const {
      addressLine1,
      addressLine2,
      locality,
      landmark,
      city,
      district,
      state,
      country,
      pincode,
      isLocationConfirmed,
    } = req.body;

    if (addressLine1) business.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) business.addressLine2 = addressLine2;
    if (locality) business.locality = locality;
    if (landmark !== undefined) business.landmark = landmark;
    if (city) business.city = city;
    if (district) business.district = district;
    if (state) business.state = state;
    if (country) business.country = country;
    if (pincode) business.pincode = pincode;
    if (isLocationConfirmed !== undefined) business.isLocationConfirmed = isLocationConfirmed;

    // Update combined address string for backward compatibility
    const combined = [addressLine1, addressLine2, locality, landmark, city].filter(Boolean).join(', ');
    if (combined) business.address = combined;

    // Check all possible places coordinates could be provided:
    let coords = req.body.coordinates;
    if (!coords && req.body.location && Array.isArray(req.body.location.coordinates)) {
      coords = req.body.location.coordinates;
    } else if (!coords && Array.isArray(req.body.location) && req.body.location.length === 2) {
      coords = req.body.location;
    }

    if (coords && Array.isArray(coords) && coords.length === 2) {
      const lng = parseFloat(coords[0]);
      const lat = parseFloat(coords[1]);
      if (!isNaN(lng) && !isNaN(lat) && !(lng === 0 && lat === 0)) {
        business.location = {
          type: 'Point',
          coordinates: [lng, lat],
        };
        business.isLocationConfirmed = true;
      }
    } else if (!business.location?.coordinates && (business.district || business.city || business.pincode)) {
      // Auto fallback geocoding
      try {
        const geo = await geocodingService.geocodeAddress({
          addressLine1: business.addressLine1 || business.address,
          locality: business.locality,
          city: business.city,
          district: business.district,
          state: business.state,
          pincode: business.pincode,
        });
        if (geo && geo.latitude && geo.longitude) {
          business.location = {
            type: 'Point',
            coordinates: [geo.longitude, geo.latitude],
          };
          business.isLocationConfirmed = true;
        }
      } catch (gErr) {
        console.warn('[UpdateBusinessAddress] Geocode warning:', gErr.message);
      }
    }

    await business.save();

    // Cascade updated location to all instruments under this business using business address
    if (business.location?.coordinates && business.location.coordinates.length === 2) {
      await Instrument.updateMany(
        { business: business._id, useBusinessAddress: true },
        {
          $set: {
            location: business.location,
            isLocationConfirmed: business.isLocationConfirmed,
            'verificationAddress.addressLine1': business.addressLine1 || business.address,
            'verificationAddress.addressLine2': business.addressLine2 || '',
            'verificationAddress.locality': business.locality || '',
            'verificationAddress.landmark': business.landmark || '',
            'verificationAddress.city': business.city || '',
            'verificationAddress.district': business.district || '',
            'verificationAddress.state': business.state || '',
            'verificationAddress.country': business.country || 'India',
            'verificationAddress.pincode': business.pincode || '',
          },
        }
      );
    }

    await logAction({
      user: req.user._id,
      action: 'BUSINESS_ADDRESS_UPDATED',
      entityType: 'Business',
      entityId: business._id,
      description: `Updated verification location for business '${business.businessName}'`,
    });

    return ApiResponse.success(res, business, 'Business verification address updated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyBusiness, createBusiness, updateBusiness, updateBusinessAddress };
