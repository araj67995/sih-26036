const { geocodeAddress, reverseGeocode, validateCoordinates } = require('../services/geocodingService');
const ApiResponse = require('../utils/apiResponse');

/**
 * @desc   Geocode address to [longitude, latitude] coordinates
 * @route  POST /api/geocoding/geocode
 * @access Private
 */
const geocode = async (req, res, next) => {
  try {
    const addressInput = req.body.address || req.body;
    if (!addressInput) {
      return ApiResponse.error(res, 'Please provide an address to locate', 400);
    }

    const result = await geocodeAddress(addressInput);

    return ApiResponse.success(
      res,
      result,
      `Address located successfully: ${result.latitude.toFixed(5)}, ${result.longitude.toFixed(5)}`
    );
  } catch (error) {
    return ApiResponse.error(res, error.message || 'Geocoding failed', 400);
  }
};

/**
 * @desc   Reverse geocode coordinates to human-readable address
 * @route  POST /api/geocoding/reverse
 * @access Private
 */
const reverse = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return ApiResponse.error(res, 'Please provide latitude and longitude', 400);
    }

    const result = await reverseGeocode(latitude, longitude);
    return ApiResponse.success(res, result, 'Coordinates reversed to address');
  } catch (error) {
    return ApiResponse.error(res, error.message || 'Reverse geocoding failed', 400);
  }
};

module.exports = {
  geocode,
  reverse,
};
