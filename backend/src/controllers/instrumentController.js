const { Instrument, Business, Application } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { logAction } = require('../services/auditService');

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
      .populate('business', 'businessName businessType district state')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, instruments, 'Instruments retrieved successfully');
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

    // If applicant, verify or set their own business
    if (req.user.role === 'applicant') {
      const business = await Business.findOne({ owner: req.user._id });
      if (!business) {
        return ApiResponse.error(res, 'Please create a business profile before registering instruments', 400);
      }
      businessId = business._id;
    }

    const instrument = await Instrument.create({
      ...req.body,
      business: businessId,
      status: 'REGISTERED',
    });

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

module.exports = {
  getInstruments,
  registerInstrument,
  getInstrumentById,
  updateInstrument,
  deleteInstrument,
};
