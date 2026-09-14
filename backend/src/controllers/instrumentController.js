const { Instrument, Business, Application } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { logAction } = require('../services/auditService');
const geocodingService = require('../services/geocodingService');

/**
 * @desc   Get all registered instruments for current applicant's business (or all for admin/officer)
 * @route  GET /api/instruments
 * @access Private
 */
const getInstruments = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'applicant') {
      const business = await Business.findOne({ owner: req.user._id });
      if (!business) {
        return ApiResponse.success(res, [], 'No business found');
      }
      query.business = business._id;
    }

    const instruments = await Instrument.find(query)
      .populate('business')
      .sort({ createdAt: -1 });

    // Ensure instruments with useBusinessAddress dynamically inherit business location & address if empty
    const result = instruments.map((inst) => {
      const doc = inst.toObject();
      const hasSelfCoords =
        doc.location?.coordinates &&
        Array.isArray(doc.location.coordinates) &&
        doc.location.coordinates.length === 2 &&
        !(doc.location.coordinates[0] === 0 && doc.location.coordinates[1] === 0);

      if (!hasSelfCoords && inst.business) {
        const bizCoords = inst.business.location?.coordinates;
        if (bizCoords && Array.isArray(bizCoords) && bizCoords.length === 2 && !(bizCoords[0] === 0 && bizCoords[1] === 0)) {
          doc.location = {
            type: 'Point',
            coordinates: [bizCoords[0], bizCoords[1]],
          };
          doc.isLocationConfirmed = inst.business.isLocationConfirmed ?? true;
          if (!doc.verificationAddress?.addressLine1) {
            doc.verificationAddress = {
              addressLine1: inst.business.addressLine1 || inst.business.address,
              addressLine2: inst.business.addressLine2 || '',
              locality: inst.business.locality || '',
              landmark: inst.business.landmark || '',
              city: inst.business.city || '',
              district: inst.business.district || '',
              state: inst.business.state || '',
              country: inst.business.country || 'India',
              pincode: inst.business.pincode || '',
              formattedAddress: inst.business.address,
            };
          }
        }
      }
      return doc;
    });

    return ApiResponse.success(res, result, 'Instruments retrieved successfully');
  } catch (error) {
    next(error);
  }
};


/**
 * @desc   Register a new weighing/measuring instrument
 * @route  POST /api/instruments
  * @access Private (Applicant / Admin)
 */
const registerInstrument = async (req, res, next) => {
  try {
    let businessId = req.body.business;
    let business = null;

    // If applicant, verify or set their own business
    if (req.user.role === 'applicant') {
      business = await Business.findOne({ owner: req.user._id });
      if (!business) {
        return ApiResponse.error(res, 'Please create a business profile before registering instruments', 400);
      }
      businessId = business._id;
    } else if (businessId) {
      business = await Business.findById(businessId);
    }

    const instrumentData = {
      ...req.body,
      business: businessId,
      status: 'REGISTERED',
    };

    // Check all possible places coordinates could be provided:
    let coords = req.body.coordinates;
    if (!coords && req.body.location && Array.isArray(req.body.location.coordinates)) {
      coords = req.body.location.coordinates;
    } else if (!coords && Array.isArray(req.body.location) && req.body.location.length === 2) {
      coords = req.body.location;
    }

    // If useBusinessAddress is true (or default) and no custom coordinates provided, inherit from business
    if (
      req.body.useBusinessAddress !== false &&
      (!coords || coords.length === 0) &&
      business
    ) {
      if (business.location?.coordinates && business.location.coordinates.length === 2) {
        coords = business.location.coordinates;
      }
      instrumentData.verificationAddress = {
        addressLine1: business.addressLine1 || business.address,
        addressLine2: business.addressLine2 || '',
        locality: business.locality || '',
        landmark: business.landmark || '',
        city: business.city || '',
        district: business.district || '',
        state: business.state || '',
        country: business.country || 'India',
        pincode: business.pincode || '',
      };
      instrumentData.useBusinessAddress = true;
      instrumentData.isLocationConfirmed = business.isLocationConfirmed || false;
    }

    if (coords && Array.isArray(coords) && coords.length === 2) {
      const lng = parseFloat(coords[0]);
      const lat = parseFloat(coords[1]);
      if (!isNaN(lng) && !isNaN(lat) && !(lng === 0 && lat === 0)) {
        instrumentData.location = {
          type: 'Point',
          coordinates: [lng, lat],
        };
        instrumentData.useBusinessAddress = req.body.useBusinessAddress ?? false;
        instrumentData.isLocationConfirmed = req.body.isLocationConfirmed ?? true;
      }
    } else if (
      instrumentData.verificationAddress &&
      (instrumentData.verificationAddress.district || instrumentData.verificationAddress.city || instrumentData.verificationAddress.pincode)
    ) {
      try {
        const geo = await geocodingService.geocodeAddress(instrumentData.verificationAddress);
        if (geo && geo.latitude && geo.longitude) {
          instrumentData.location = {
            type: 'Point',
            coordinates: [geo.longitude, geo.latitude],
          };
          instrumentData.isLocationConfirmed = true;
        }
      } catch (geoErr) {
        console.warn('[RegisterInstrument] Fallback geocoding warning:', geoErr.message);
      }
    }

    const instrument = await Instrument.create(instrumentData);

    await logAction({
      user: req.user._id,
      action: 'INSTRUMENT_REGISTERED',
      entityType: 'Instrument',
      entityId: instrument._id,
      description: `Instrument ${instrument.model} (SN: ${instrument.serialNumber}) registered`,
    });

    return ApiResponse.success(res, instrument, 'Instrument registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get single instrument by ID
 * @route  GET /api/instruments/:id
 * @access Private
 */
const getInstrumentById = async (req, res, next) => {
  try {
    const instrument = await Instrument.findById(req.params.id).populate('business');
    if (!instrument) {
      return ApiResponse.error(res, 'Instrument not found', 404);
    }
    return ApiResponse.success(res, instrument, 'Instrument details retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update instrument details
 * @route  PUT /api/instruments/:id
 * @access Private (Applicant / Admin)
 */
const updateInstrument = async (req, res, next) => {
  try {
    let instrument = await Instrument.findById(req.params.id);
    if (!instrument) {
      return ApiResponse.error(res, 'Instrument not found', 404);
    }

    instrument = await Instrument.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    return ApiResponse.success(res, instrument, 'Instrument updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Delete instrument if no active verification application
 * @route  DELETE /api/instruments/:id
 * @access Private (Applicant / Admin)
 */
const deleteInstrument = async (req, res, next) => {
  try {
    const instrument = await Instrument.findById(req.params.id);
    if (!instrument) {
      return ApiResponse.error(res, 'Instrument not found', 404);
    }

    // Check if linked to an active application
    const activeApp = await Application.findOne({
      instrument: instrument._id,
      status: { $in: ['SUBMITTED', 'DOCUMENT_VERIFICATION', 'INSPECTION_SCHEDULED', 'APPROVED', 'CERTIFICATE_ISSUED'] },
    });

    if (activeApp) {
      return ApiResponse.error(
        res,
        'Cannot delete instrument with an active verification application or certificate',
        400
      );
    }

    await Instrument.findByIdAndDelete(req.params.id);

    return ApiResponse.success(res, {}, 'Instrument deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update instrument verification location and coordinates
 * @route  PUT /api/instruments/:id/location
 * @access Private (Applicant / Admin)
 */
const updateInstrumentLocation = async (req, res, next) => {
  try {
    const instrument = await Instrument.findById(req.params.id);
    if (!instrument) {
      return ApiResponse.error(res, 'Instrument not found', 404);
    }

    const {
      verificationAddress,
      useBusinessAddress,
      isLocationConfirmed,
      premisesDescription,
    } = req.body;

    if (verificationAddress) {
      instrument.verificationAddress = {
        ...(instrument.verificationAddress ? (instrument.verificationAddress.toObject ? instrument.verificationAddress.toObject() : instrument.verificationAddress) : {}),
        ...verificationAddress,
      };
    }
    if (useBusinessAddress !== undefined) instrument.useBusinessAddress = useBusinessAddress;
    if (isLocationConfirmed !== undefined) instrument.isLocationConfirmed = isLocationConfirmed;
    if (premisesDescription !== undefined) instrument.premisesDescription = premisesDescription;

    // Check all possible places coordinates could be provided:
    let coords = req.body.coordinates;
    if (!coords && req.body.location && Array.isArray(req.body.location.coordinates)) {
      coords = req.body.location.coordinates;
    } else if (!coords && Array.isArray(req.body.location) && req.body.location.length === 2) {
      coords = req.body.location;
    }

    // If useBusinessAddress is true and no coordinates passed, inherit from business
    if (instrument.useBusinessAddress && (!coords || coords.length === 0)) {
      const business = await Business.findById(instrument.business);
      if (business && business.location?.coordinates && business.location.coordinates.length === 2) {
        coords = business.location.coordinates;
        instrument.isLocationConfirmed = business.isLocationConfirmed ?? true;
        instrument.verificationAddress = {
          addressLine1: business.addressLine1 || business.address,
          addressLine2: business.addressLine2 || '',
          locality: business.locality || '',
          landmark: business.landmark || '',
          city: business.city || '',
          district: business.district || '',
          state: business.state || '',
          country: business.country || 'India',
          pincode: business.pincode || '',
        };
      }
    }

    if (coords && Array.isArray(coords) && coords.length === 2) {
      const lng = parseFloat(coords[0]);
      const lat = parseFloat(coords[1]);
      if (!isNaN(lng) && !isNaN(lat) && !(lng === 0 && lat === 0)) {
        instrument.location = {
          type: 'Point',
          coordinates: [lng, lat],
        };
        instrument.isLocationConfirmed = isLocationConfirmed !== undefined ? isLocationConfirmed : true;
      }
    } else if (
      instrument.verificationAddress &&
      (instrument.verificationAddress.district || instrument.verificationAddress.city || instrument.verificationAddress.pincode)
    ) {
      // Automatic fallback geocoding if coordinates were not provided
      try {
        const geo = await geocodingService.geocodeAddress(instrument.verificationAddress);
        if (geo && geo.latitude && geo.longitude) {
          instrument.location = {
            type: 'Point',
            coordinates: [geo.longitude, geo.latitude],
          };
          instrument.isLocationConfirmed = true;
          if (geo.formattedAddress && !instrument.verificationAddress.formattedAddress) {
            instrument.verificationAddress.formattedAddress = geo.formattedAddress;
          }
        }
      } catch (geoErr) {
        console.warn('[InstrumentLocation] Fallback geocoding warning:', geoErr.message);
      }
    }

    await instrument.save();

    // Re-query populated instrument so frontend receives full business details
    const populated = await Instrument.findById(instrument._id).populate('business');

    await logAction({
      user: req.user._id,
      action: 'INSTRUMENT_LOCATION_UPDATED',
      entityType: 'Instrument',
      entityId: instrument._id,
      description: `Verification location updated for instrument ${instrument.model} (SN: ${instrument.serialNumber})`,
    });

    return ApiResponse.success(res, populated, 'Instrument verification location updated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInstruments,
  registerInstrument,
  getInstrumentById,
  updateInstrument,
  deleteInstrument,
  updateInstrumentLocation,
};
