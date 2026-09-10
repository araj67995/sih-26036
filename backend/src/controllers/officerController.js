const { Application, Document, Inspection, Certificate, Instrument, User } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { logAction } = require('../services/auditService');
const { generateCertificatePDF } = require('../services/pdfService');

/**
 * @desc   Get applications assigned to current officer or available for pickup
 * @route  GET /api/officer/applications
 * @access Private (Officer / Admin)
 */
const getAssignedApplications = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'officer') {
      query = {
        $or: [{ assignedOfficer: req.user._id }, { assignedOfficer: null }],
      };
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    const applications = await Application.find(query)
      .populate('applicant', 'name email phone')
      .populate('business', 'businessName businessType address district state contactNumber')
      .populate('instrument', 'instrumentType manufacturer model serialNumber capacity unit')
      .populate('assignedOfficer', 'name email')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, applications, 'Assigned applications retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get single application details for officer inspection view
 * @route  GET /api/officer/applications/:id
 * @access Private (Officer / Admin)
 */
const getOfficerApplicationById = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('applicant', 'name email phone')
      .populate('business')
      .populate('instrument')
      .populate('assignedOfficer', 'name email phone');

    if (!application) {
      return ApiResponse.error(res, 'Application not found', 404);
    }

    const documents = await Document.find({ application: application._id }).sort({ uploadedAt: -1 });
    const inspection = await Inspection.findOne({ application: application._id });
    const certificate = await Certificate.findOne({ application: application._id });

    return ApiResponse.success(res, {
      application,
      documents,
      inspection,
      certificate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Review documents: Accept (APPROVED_FOR_INSPECTION) or Reject (DOCUMENT_REJECTED)
 * @route  PUT /api/officer/applications/:id/review
 * @access Private (Officer / Admin)
 */
const reviewApplication = async (req, res, next) => {
  try {
    const { action, remarks, rejectionReason } = req.body;
    const application = await Application.findById(req.params.id);

    if (!application) {
      return ApiResponse.error(res, 'Application not found', 404);
    }

    // Auto-assign to current officer if not assigned
    if (!application.assignedOfficer) {
      application.assignedOfficer = req.user._id;
    }

    const prevStatus = application.status;

    if (action === 'APPROVE') {
      application.status = 'APPROVED_FOR_INSPECTION';
      application.remarks = remarks || 'Documents verified and approved for physical inspection.';
      application.rejectionReason = null;
    } else if (action === 'REJECT') {
      application.status = 'DOCUMENT_REJECTED';
      application.rejectionReason = rejectionReason || 'Documents do not satisfy metrological requirements';
      application.remarks = remarks || '';
    } else {
      return ApiResponse.error(res, "Action must be either 'APPROVE' or 'REJECT'", 400);
    }

    await application.save();

    await logAction({
      user: req.user._id,
      action: action === 'APPROVE' ? 'DOCUMENT_APPROVED' : 'DOCUMENT_REJECTED',
      entityType: 'Application',
      entityId: application._id,
      previousStatus: prevStatus,
      newStatus: application.status,
      description: `Officer ${req.user.name} reviewed application: ${application.status}. Note: ${application.remarks || application.rejectionReason}`,
    });

    return ApiResponse.success(res, application, `Application status updated to ${application.status}`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Schedule physical inspection date
 * @route  PUT /api/officer/applications/:id/schedule
 * @access Private (Officer / Admin)
 */
const scheduleInspection = async (req, res, next) => {
  try {
    const { inspectionDate, remarks } = req.body;

    if (!inspectionDate) {
      return ApiResponse.error(res, 'Please provide an inspection date', 400);
    }

    const application = await Application.findById(req.params.id);
    if (!application) {
      return ApiResponse.error(res, 'Application not found', 404);
    }

    const prevStatus = application.status;
    application.inspectionDate = new Date(inspectionDate);
    application.status = 'INSPECTION_SCHEDULED';
    if (remarks) {
      application.remarks = remarks;
    }

    await application.save();

    await logAction({
      user: req.user._id,
      action: 'INSPECTION_SCHEDULED',
      entityType: 'Application',
      entityId: application._id,
      previousStatus: prevStatus,
      newStatus: 'INSPECTION_SCHEDULED',
      description: `Inspection scheduled for ${new Date(inspectionDate).toLocaleDateString()} by Officer ${req.user.name}`,
    });

    return ApiResponse.success(res, application, 'Inspection scheduled successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Approve application & generate certificate (only if inspection is PASS)
 * @route  POST /api/applications/:id/approve
 * @access Private (Officer / Admin)
 */
const approveApplication = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('business')
      .populate('instrument')
      .populate('applicant');

    if (!application) {
      return ApiResponse.error(res, 'Application not found', 404);
    }

    // Check inspection record
    const inspection = await Inspection.findOne({ application: application._id });
    if (!inspection) {
      return ApiResponse.error(res, 'Cannot approve: Physical inspection observations must be recorded first', 400);
    }

    if (inspection.result !== 'PASS') {
      return ApiResponse.error(res, 'Cannot approve: Instrument inspection did not PASS accuracy verification', 400);
    }

    const prevStatus = application.status;

    // Generate unique Certificate Number: LM-[STATE_CODE]-YYYY-XXXXXX
    const stateCode = application.business?.state ? application.business.state.substring(0, 2).toUpperCase() : 'DL';
    const year = new Date().getFullYear();
    const count = await Certificate.countDocuments();
    const seq = String(count + 1).padStart(6, '0');
    const certificateNumber = `LM-${stateCode}-${year}-${seq}`;

    // Token for tamper-proof verification
    const verificationToken = `TOKEN-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Calculate 1-year validity period
    const issueDate = new Date();
    const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    // Generate PDF with embedded QR Code pointing to public verification URL
    const pdfUrl = await generateCertificatePDF({
      certificateNumber,
      businessName: application.business.businessName,
      businessAddress: `${application.business.address}, ${application.business.district}, ${application.business.state}`,
      instrumentType: application.instrument.instrumentType,
      manufacturer: application.instrument.manufacturer,
      model: application.instrument.model,
      serialNumber: application.instrument.serialNumber,
      capacity: application.instrument.capacity,
      unit: application.instrument.unit,
      standardWeight: inspection.standardWeight,
      observedReading: inspection.observedReading,
      error: inspection.error,
      issueDate,
      validUntil,
      officerName: req.user.name,
      verificationToken,
    });

    const qrCodeUrl = `/verify/${certificateNumber}`;

    // Create Certificate record in MongoDB
    const certificate = await Certificate.create({
      certificateNumber,
      application: application._id,
      instrument: application.instrument._id,
      business: application.business._id,
      issueDate,
      validUntil,
      status: 'VALID',
      pdfUrl,
      qrCodeUrl,
      verificationToken,
      issuedBy: req.user._id,
    });

    // Update Application status
    application.status = 'CERTIFICATE_ISSUED';
    application.remarks = 'Verification approved. Digital certificate issued.';
    await application.save();

    // Update Instrument status
    await Instrument.findByIdAndUpdate(application.instrument._id, { status: 'VERIFIED' });

    // Record Audit Log
    await logAction({
      user: req.user._id,
      action: 'CERTIFICATE_ISSUED',
      entityType: 'Certificate',
      entityId: certificate._id,
      previousStatus: prevStatus,
      newStatus: 'CERTIFICATE_ISSUED',
      description: `Certificate ${certificate.certificateNumber} issued for ${application.instrument.model}`,
    });

    return ApiResponse.success(
      res,
      { application, certificate },
      'Verification approved and digital certificate generated successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Reject application
 * @route  POST /api/applications/:id/reject
 * @access Private (Officer / Admin)
 */
const rejectApplication = async (req, res, next) => {
  try {
    const { rejectionReason, remarks } = req.body;
    const application = await Application.findById(req.params.id);

    if (!application) {
      return ApiResponse.error(res, 'Application not found', 404);
    }

    const prevStatus = application.status;
    application.status = 'REJECTED';
    application.rejectionReason = rejectionReason || 'Verification failed metrological inspection criteria';
    application.remarks = remarks || '';
    await application.save();

    // Update Instrument status to REJECTED
    await Instrument.findByIdAndUpdate(application.instrument, { status: 'REJECTED' });

    await logAction({
      user: req.user._id,
      action: 'APPLICATION_REJECTED',
      entityType: 'Application',
      entityId: application._id,
      previousStatus: prevStatus,
      newStatus: 'REJECTED',
      description: `Application rejected by ${req.user.name}. Reason: ${application.rejectionReason}`,
    });

    return ApiResponse.success(res, application, 'Application marked as REJECTED');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Officer dashboard statistics
 * @route  GET /api/officer/stats
 * @access Private (Officer)
 */
const getOfficerStats = async (req, res, next) => {
  try {
    const assignedApplications = await Application.countDocuments({ assignedOfficer: req.user._id });
    const pendingReview = await Application.countDocuments({
      assignedOfficer: req.user._id,
      status: { $in: ['SUBMITTED', 'DOCUMENT_VERIFICATION'] },
    });
    const scheduledInspections = await Application.countDocuments({
      assignedOfficer: req.user._id,
      status: 'INSPECTION_SCHEDULED',
    });
    const completedInspections = await Inspection.countDocuments({ officer: req.user._id });
    const approvedApplications = await Application.countDocuments({
      assignedOfficer: req.user._id,
      status: { $in: ['APPROVED', 'CERTIFICATE_ISSUED'] },
    });
    const rejectedApplications = await Application.countDocuments({
      assignedOfficer: req.user._id,
      status: { $in: ['REJECTED', 'DOCUMENT_REJECTED'] },
    });

    return ApiResponse.success(
      res,
      {
        assignedApplications,
        pendingReview,
        scheduledInspections,
        completedInspections,
        approvedApplications,
        rejectedApplications,
      },
      'Officer stats loaded'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssignedApplications,
  getOfficerApplicationById,
  reviewApplication,
  scheduleInspection,
  approveApplication,
  rejectApplication,
  getOfficerStats,
};
