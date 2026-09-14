const { Officer, User } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { logAction } = require('../services/auditService');
const { validateCoordinates, formatDistance } = require('../services/officerAllocationService');

/**
 * @desc   Get nearby officers for given coordinates
 * @route  GET /api/officers/nearby?lat=xx&lng=yy&maxKm=50
 * @access Private (Admin / Officer)
 */
const getNearbyOfficers = async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const maxKm = parseFloat(req.query.maxKm) || 100;

    if (isNaN(lat) || isNaN(lng)) {
      return ApiResponse.error(res, 'Please provide valid numeric lat and lng query parameters', 400);
    }

    const maxDistanceMeters = maxKm * 1000;

    const pipeline = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          distanceField: 'calculatedDistance',
          spherical: true,
          maxDistance: maxDistanceMeters,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      { $unwind: '$userDetails' },
      {
        $project: {
          officerName: 1,
          officeName: 1,
          officeAddress: 1,
          district: 1,
          state: 1,
          pincode: 1,
          location: 1,
          serviceRadius: 1,
          availabilityStatus: 1,
          status: 1,
          calculatedDistance: 1,
          'userDetails._id': 1,
          'userDetails.name': 1,
          'userDetails.email': 1,
          'userDetails.phone': 1,
          'userDetails.status': 1,
        },
      },
      { $sort: { calculatedDistance: 1 } },
    ];

    const results = await Officer.aggregate(pipeline);

    const formatted = results.map((r) => ({
      ...r,
      distanceFormatted: formatDistance(r.calculatedDistance),
      isWithinServiceRadius: r.calculatedDistance <= r.serviceRadius * 1000,
    }));

    return ApiResponse.success(res, formatted, `Found ${formatted.length} officers nearby`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get all officers with location profiles
 * @route  GET /api/officers
 * @access Private (Admin / Officer)
 */
const getAllOfficers = async (req, res, next) => {
  try {
    const officers = await Officer.find()
      .populate('user', 'name email phone status role')
      .sort({ state: 1, district: 1 });

    return ApiResponse.success(res, officers, 'Officers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get single officer profile by user ID or officer ID
 * @route  GET /api/officers/:id
 * @access Private (Admin / Officer)
 */
const getOfficerById = async (req, res, next) => {
  try {
    let officer = await Officer.findById(req.params.id).populate('user', 'name email phone status');
    if (!officer) {
      officer = await Officer.findOne({ user: req.params.id }).populate('user', 'name email phone status');
    }

    if (!officer) {
      return ApiResponse.error(res, 'Officer location profile not found', 404);
    }

    return ApiResponse.success(res, officer, 'Officer profile retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Admin creates or updates officer office location & service radius
 * @route  PUT /api/officers/:id/location
 * @access Private (Admin)
 */
const updateOfficerLocation = async (req, res, next) => {
  try {
    const {
      officeName,
      officeAddress,
      district,
      state,
      pincode,
      serviceRadius,
      availabilityStatus,
      status,
      coordinates, // [lng, lat]
      officerName,
    } = req.body;

    let officer = await Officer.findById(req.params.id);
    if (!officer) {
      // Check if param is user ID
      officer = await Officer.findOne({ user: req.params.id });
    }

    // If officer profile does not exist yet for this user, create it!
    if (!officer) {
      const user = await User.findOne({ _id: req.params.id, role: 'officer' });
      if (!user) {
        return ApiResponse.error(res, 'Legal Metrology Officer user account not found', 404);
      }

      if (!coordinates || coordinates.length !== 2) {
        return ApiResponse.error(res, 'Coordinates [longitude, latitude] are required to set office location', 400);
      }

      officer = await Officer.create({
        user: user._id,
        officerName: officerName || user.name,
        officeName: officeName || `Legal Metrology Office, ${district || user.district || 'District'}`,
        officeAddress: officeAddress || 'District Administrative Complex',
        district: district || 'Central',
        state: state || 'State',
        pincode: pincode || '110001',
        serviceRadius: serviceRadius || 50,
        availabilityStatus: availabilityStatus || 'AVAILABLE',
        status: status || 'active',
        location: {
          type: 'Point',
          coordinates: [parseFloat(coordinates[0]), parseFloat(coordinates[1])],
        },
      });

      await logAction({
        user: req.user._id,
        action: 'OFFICER_PROFILE_CREATED',
        entityType: 'User',
        entityId: user._id,
        description: `Admin created officer location profile for ${user.name} at ${officer.officeName}`,
      });

      return ApiResponse.success(res, officer, 'Officer location profile created successfully', 201);
    }

    // Update existing profile
    if (officeName) officer.officeName = officeName;
    if (officeAddress) officer.officeAddress = officeAddress;
    if (district) officer.district = district;
    if (state) officer.state = state;
    if (pincode) officer.pincode = pincode;
    if (serviceRadius) officer.serviceRadius = Number(serviceRadius);
    if (availabilityStatus) officer.availabilityStatus = availabilityStatus;
    if (status) officer.status = status;
    if (officerName) officer.officerName = officerName;

    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      const lng = parseFloat(coordinates[0]);
      const lat = parseFloat(coordinates[1]);
      if (isNaN(lng) || isNaN(lat)) {
        return ApiResponse.error(res, 'Invalid coordinates', 400);
      }
      officer.location = {
        type: 'Point',
        coordinates: [lng, lat],
      };
    }

    await officer.save();

    await logAction({
      user: req.user._id,
      action: 'OFFICER_LOCATION_UPDATED',
      entityType: 'User',
      entityId: officer.user,
      description: `Admin updated office location for ${officer.officerName} (${officer.officeName})`,
    });

    return ApiResponse.success(res, officer, 'Officer location profile updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Officer updates their own availability status
 * @route  PUT /api/officers/me/availability
 * @access Private (Officer)
 */
const updateMyAvailability = async (req, res, next) => {
  try {
    const { availabilityStatus } = req.body;
    if (!['AVAILABLE', 'UNAVAILABLE', 'ON_LEAVE', 'BUSY'].includes(availabilityStatus)) {
      return ApiResponse.error(res, 'Invalid availability status', 400);
    }

    let officer = await Officer.findOne({ user: req.user._id });
    if (!officer) {
      return ApiResponse.error(res, 'Officer profile not configured yet', 404);
    }

    officer.availabilityStatus = availabilityStatus;
    await officer.save();

    await logAction({
      user: req.user._id,
      action: 'OFFICER_AVAILABILITY_CHANGED',
      entityType: 'User',
      entityId: req.user._id,
      description: `Officer ${req.user.name} changed availability status to ${availabilityStatus}`,
    });

    return ApiResponse.success(res, officer, `Availability status updated to ${availabilityStatus}`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNearbyOfficers,
  getAllOfficers,
  getOfficerById,
  updateOfficerLocation,
  updateMyAvailability,
};
