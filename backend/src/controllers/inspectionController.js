const { Inspection, Application, Instrument, Notification } = require('../models');
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

    // Evaluate error tolerance and physical verification conditions
    const std = Number(standardWeight);
    const obs = Number(observedReading);
    const mpe = Number(permissibleError);
    const calculatedError = Number((obs - std).toFixed(6));
    const isCompliant = Math.abs(calculatedError) <= Math.abs(mpe);

    const isConditionFailed = instrumentCondition === 'DAMAGED' || instrumentCondition === 'UNSATISFACTORY';
    const isSerialFailed = serialNumberVerified === false;
    const isSealFailed = sealCondition === 'BROKEN' || sealCondition === 'TAMPERED';

    const isFailed = !isCompliant || isConditionFailed || isSerialFailed || isSealFailed;
    const result = isFailed ? 'FAIL' : 'PASS';

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

    const prevStatus = application.status;

    // If inspection failed, immediately reject the application and instrument
    if (result === 'FAIL') {
      application.status = 'REJECTED';
      const failureReasons = [];
      if (!isCompliant) failureReasons.push(`Error (${calculatedError > 0 ? '+' : ''}${calculatedError} kg) exceeds permissible limit (±${mpe} kg)`);
      if (isConditionFailed) failureReasons.push(`Physical condition defective: ${instrumentCondition}`);
      if (isSerialFailed) failureReasons.push(`Serial plate verification failed`);
      if (isSealFailed) failureReasons.push(`Security seal is ${sealCondition}`);
      if (remarks) failureReasons.push(remarks);

      application.rejectionReason = failureReasons.join('; ') || 'Instrument failed metrological inspection criteria';
      await application.save();

      if (application.instrument) {
        await Instrument.findByIdAndUpdate(application.instrument, { status: 'REJECTED' });
      }

      await logAction({
        user: req.user._id,
        action: 'APPLICATION_REJECTED',
        entityType: 'Application',
        entityId: application._id,
        previousStatus: prevStatus,
        newStatus: 'REJECTED',
        description: `Application rejected after failed inspection: ${application.rejectionReason}`,
      });

      try {
        await Notification.create({
          user: application.applicant,
          recipient: application.applicant,
          title: 'Verification Inspection Failed - Application Rejected',
          message: `Application ${application.applicationNumber} has been rejected following physical inspection. Reason: ${application.rejectionReason}`,
          type: 'APPLICATION_REJECTED',
          relatedEntity: { entityType: 'Application', entityId: application._id },
        });
      } catch (notifErr) {
        console.warn('Notification creation warning:', notifErr.message);
      }
    } else {
      // PASS
      application.status = 'INSPECTION_COMPLETED';
      await application.save();

      await logAction({
        user: req.user._id,
        action: 'INSPECTION_RECORDED',
        entityType: 'Inspection',
        entityId: inspection._id,
        previousStatus: prevStatus,
        newStatus: 'INSPECTION_COMPLETED',
        description: `Inspection passed by Officer ${req.user.name}. Reading: ${obs}, Standard: ${std}, Error: ${calculatedError > 0 ? '+' : ''}${calculatedError}, Result: PASS`,
      });
    }

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
