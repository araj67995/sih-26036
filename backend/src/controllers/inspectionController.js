const { Inspection, Application } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { logAction } = require('../services/auditService');

/**
 * @desc   Record physical inspection observations and readings
 * @route  POST /api/inspections
 * @access Private (Officer / Admin)
 */
const recordInspection = async (req, res, next) => {
  try {
    const {
      applicationId,
      instrumentCondition,
      serialNumberVerified,
      sealCondition,
      standardWeight,
      observedReading,
      permissibleError,
      remarks,
      evidenceImages,
    } = req.body;

    const application = await Application.findById(applicationId);
    if (!application) {
      return ApiResponse.error(res, 'Application not found', 404);
    }

    // Auto calculate error: Error = observedReading - standardWeight
    const std = Number(standardWeight);
    const obs = Number(observedReading);
    const mpe = Number(permissibleError);
    const calculatedError = Number((obs - std).toFixed(6));
    const isCompliant = Math.abs(calculatedError) <= Math.abs(mpe);
    const result = isCompliant ? 'PASS' : 'FAIL';

    // Check if inspection already exists for this application
    let inspection = await Inspection.findOne({ application: applicationId });

    if (inspection) {
      inspection.officer = req.user._id;
      inspection.inspectionDate = new Date();
      inspection.instrumentCondition = instrumentCondition || 'SATISFACTORY';
      inspection.serialNumberVerified = serialNumberVerified !== undefined ? serialNumberVerified : true;
      inspection.sealCondition = sealCondition || 'INTACT';
      inspection.standardWeight = std;
      inspection.observedReading = obs;
      inspection.error = calculatedError;
      inspection.permissibleError = mpe;
      inspection.result = result;
      inspection.remarks = remarks || '';
      if (evidenceImages) inspection.evidenceImages = evidenceImages;
      await inspection.save();
    } else {
      inspection = await Inspection.create({
        application: applicationId,
        officer: req.user._id,
        inspectionDate: new Date(),
        instrumentCondition: instrumentCondition || 'SATISFACTORY',
        serialNumberVerified: serialNumberVerified !== undefined ? serialNumberVerified : true,
        sealCondition: sealCondition || 'INTACT',
        standardWeight: std,
        observedReading: obs,
        error: calculatedError,
        permissibleError: mpe,
        result,
        remarks: remarks || '',
        evidenceImages: evidenceImages || [],
      });
    }

    // Move application status to INSPECTION_COMPLETED
    const prevStatus = application.status;
    application.status = 'INSPECTION_COMPLETED';
    await application.save();

    await logAction({
      user: req.user._id,
      action: 'INSPECTION_RECORDED',
      entityType: 'Inspection',
      entityId: inspection._id,
      previousStatus: prevStatus,
      newStatus: 'INSPECTION_COMPLETED',
      description: `Inspection completed by Officer ${req.user.name}. Reading: ${obs}, Standard: ${std}, Error: ${calculatedError > 0 ? '+' : ''}${calculatedError}, Result: ${result}`,
    });

    return ApiResponse.success(
      res,
      {
        inspection,
        calculationDetails: {
          standardWeight: std,
          observedReading: obs,
          error: calculatedError,
          absoluteError: Math.abs(calculatedError),
          permissibleError: mpe,
          result,
        },
      },
      `Inspection recorded successfully with result: ${result}`,
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get inspection details by ID or by application ID
 * @route  GET /api/inspections/:id
 * @access Private
 */
const getInspectionById = async (req, res, next) => {
  try {
    const inspection = await Inspection.findById(req.params.id)
      .populate('officer', 'name email')
      .populate('application');

    if (!inspection) {
      return ApiResponse.error(res, 'Inspection record not found', 404);
    }

    return ApiResponse.success(res, inspection, 'Inspection details retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update inspection remarks or evidence
 * @route  PUT /api/inspections/:id
 * @access Private (Officer / Admin)
 */
const updateInspection = async (req, res, next) => {
  try {
    let inspection = await Inspection.findById(req.params.id);
    if (!inspection) {
      return ApiResponse.error(res, 'Inspection record not found', 404);
    }

    inspection = await Inspection.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    return ApiResponse.success(res, inspection, 'Inspection updated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = { recordInspection, getInspectionById, updateInspection };
