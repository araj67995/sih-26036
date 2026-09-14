const { Application, Business, Instrument, Document, Certificate, Inspection, User, Payment, Notification } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { logAction } = require('../services/auditService');
const { calculateMachineFee } = require('../utils/feeCalculator');
const { generateReceiptPDF } = require('../services/pdfService');
const geocodingService = require('../services/geocodingService');
const {
  allocateNearestOfficer,
  reassignOfficerManually,
  getEligibleOfficersForApplication,
  formatDistance,
} = require('../services/officerAllocationService');

/**
 * Generate readable unique application number e.g. APP-2026-10482
 */
const generateAppNumber = () => {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `APP-${year}-${randomSuffix}`;
};

/**
 * @desc   Create and submit a new verification application with automatic nearest officer allocation
 * @route  POST /api/applications
 * @access Private (Applicant)
 */
const createApplication = async (req, res, next) => {
  try {
    const {
      instrumentId,
      applicationType,
      remarks,
      paymentMethod,
      payFee,
      verificationAddress,
      coordinates, // optional explicit [lng, lat]
    } = req.body;

    const instrument = await Instrument.findById(instrumentId);
    if (!instrument) {
      return ApiResponse.error(res, 'Instrument not found', 404);
    }

    const business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      return ApiResponse.error(res, 'Business profile not found', 400);
    }

    // Determine verification location snapshot
    let locationSnapshot = null;
    if (
      coordinates &&
      Array.isArray(coordinates) &&
      coordinates.length === 2 &&
      !(coordinates[0] === 0 && coordinates[1] === 0)
    ) {
      locationSnapshot = {
        ...(verificationAddress || {}),
        location: {
          type: 'Point',
          coordinates: [parseFloat(coordinates[0]), parseFloat(coordinates[1])],
        },
      };
    } else if (
      instrument.location?.coordinates &&
      instrument.location.coordinates.length === 2 &&
      !(instrument.location.coordinates[0] === 0 && instrument.location.coordinates[1] === 0)
    ) {
      locationSnapshot = {
        ...(instrument.verificationAddress || {}),
        location: {
          type: 'Point',
          coordinates: instrument.location.coordinates,
        },
      };
    } else if (
      business.location?.coordinates &&
      business.location.coordinates.length === 2 &&
      !(business.location.coordinates[0] === 0 && business.location.coordinates[1] === 0)
    ) {
      locationSnapshot = {
        addressLine1: business.addressLine1 || business.address,
        addressLine2: business.addressLine2,
        locality: business.locality,
        landmark: business.landmark,
        city: business.city,
        district: business.district,
        state: business.state,
        pincode: business.pincode,
        country: business.country || 'India',
        location: {
          type: 'Point',
          coordinates: business.location.coordinates,
        },
      };
    } else if (
      instrument.verificationAddress &&
      (instrument.verificationAddress.district || instrument.verificationAddress.city || instrument.verificationAddress.pincode)
    ) {
      try {
        const geo = await geocodingService.geocodeAddress(instrument.verificationAddress);
        if (geo && geo.latitude && geo.longitude) {
          locationSnapshot = {
            ...(instrument.verificationAddress.toObject ? instrument.verificationAddress.toObject() : instrument.verificationAddress),
            location: {
              type: 'Point',
              coordinates: [geo.longitude, geo.latitude],
            },
          };
          instrument.location = {
            type: 'Point',
            coordinates: [geo.longitude, geo.latitude],
          };
          instrument.isLocationConfirmed = true;
          await instrument.save();
        }
      } catch (gErr) {
        console.warn('[CreateApplication] Geocode fallback warning:', gErr.message);
      }
    } else if (business.district || business.pincode) {
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
          locationSnapshot = {
            addressLine1: business.addressLine1 || business.address,
            district: business.district,
            state: business.state,
            pincode: business.pincode,
            country: 'India',
            location: {
              type: 'Point',
              coordinates: [geo.longitude, geo.latitude],
            },
          };
          business.location = {
            type: 'Point',
            coordinates: [geo.longitude, geo.latitude],
          };
          business.isLocationConfirmed = true;
          await business.save();
        }
      } catch (gErr) {
        console.warn('[CreateApplication] Business geocode fallback warning:', gErr.message);
      }
    }

    let appNumber = generateAppNumber();
    // Ensure uniqueness
    while (await Application.findOne({ applicationNumber: appNumber })) {
      appNumber = generateAppNumber();
    }

    const application = await Application.create({
      applicationNumber: appNumber,
      applicant: req.user._id,
      business: business._id,
      instrument: instrument._id,
      applicationType: applicationType || 'INITIAL',
      status: 'SUBMITTED',
      paymentStatus: 'PAID',
      assignedOfficer: null,
      verificationLocation: locationSnapshot,
      allocationStatus: locationSnapshot?.location?.coordinates ? 'WAITING_FOR_ALLOCATION' : 'LOCATION_REQUIRED',
      submittedAt: new Date(),
      remarks: remarks || '',
    });

    // Update instrument status to VERIFICATION_PENDING
    instrument.status = 'VERIFICATION_PENDING';
    await instrument.save();

    // Trigger automatic nearest officer allocation
    try {
      await allocateNearestOfficer(application._id);
    } catch (allocErr) {
      console.warn('[Auto-Allocation during submission error]:', allocErr.message);
    }

    // Generate statutory payment & official receipt according to machine
    let paymentRecord = null;
    const feeBreakdown = calculateMachineFee(instrument, applicationType || 'INITIAL');
    const year = new Date().getFullYear();
    const receiptNumber = `RCP-${year}-${Math.floor(10000 + Math.random() * 90000)}`;
    const transactionId = `TXN-${year}-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const paidAt = new Date();

    let receiptPdfUrl = '';
    try {
      receiptPdfUrl = await generateReceiptPDF({
        receiptNumber,
        transactionId,
        applicationNumber: application.applicationNumber,
        applicationType: application.applicationType,
        businessName: business.businessName,
        businessAddress: `${business.address || ''}, ${business.district || ''}, ${business.state || ''} - ${business.pincode || ''}`,
        applicantName: req.user.name,
        applicantPhone: req.user.phone,
        applicantEmail: req.user.email,
        gstNumber: business.gstNumber || 'N/A',
        instrumentType: instrument.instrumentType,
        manufacturer: instrument.manufacturer,
        model: instrument.model,
        serialNumber: instrument.serialNumber,
        capacity: instrument.capacity,
        unit: instrument.unit,
        location: instrument.location,
        feeBreakdown,
        paymentMethod: paymentMethod || 'UPI',
        paidAt,
        clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
      });
    } catch (pdfErr) {
      console.error('PDF receipt generation warning:', pdfErr.message);
    }

    paymentRecord = await Payment.create({
      receiptNumber,
      transactionId,
      application: application._id,
      applicant: req.user._id,
      business: business._id,
      instrument: instrument._id,
      applicationType: application.applicationType,
      feeBreakdown,
      currency: 'INR',
      paymentMethod: paymentMethod || 'UPI',
      paymentGateway: 'BharatKosh / Legal Metrology Instant Settlement',
      status: 'PAID',
      paidAt,
      receiptPdfUrl,
      remarks: 'Statutory verification fee paid at submission',
    });

    application.payment = paymentRecord._id;
    await application.save();

    await logAction({
      user: req.user._id,
      action: 'APPLICATION_SUBMITTED',
      entityType: 'Application',
      entityId: application._id,
      previousStatus: 'DRAFT',
      newStatus: 'SUBMITTED',
      description: `Application ${application.applicationNumber} submitted for ${instrument.model} (SN: ${instrument.serialNumber}). Fee ₹${feeBreakdown.totalAmount} paid under receipt ${receiptNumber}`,
      ipAddress: req.ip,
    });

    try {
      await Notification.create({
        user: req.user._id,
        recipient: req.user._id,
        title: 'Verification Application & Fee Payment Received',
        message: `Application ${application.applicationNumber} submitted. Statutory fee of ₹${feeBreakdown.totalAmount} paid (Receipt: ${receiptNumber}).`,
        type: 'PAYMENT',
        relatedEntity: {
          entityType: 'Application',
          entityId: application._id,
        },
      });
    } catch (notifErr) {
      console.warn('[Notification Warning]: Failed to generate in-app notification:', notifErr.message);
    }

    return ApiResponse.success(
      res,
      {
        ...application.toObject(),
        payment: paymentRecord,
        receiptNumber,
        receiptPdfUrl,
      },
      'Verification application submitted and statutory fee paid successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get applications (filtered for applicant or full for officer/admin)
 * @route  GET /api/applications
 * @access Private
 */
const getApplications = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'applicant') {
      query.applicant = req.user._id;
    } else if (req.user.role === 'officer') {
      // Officers see either their assigned applications or pending unassigned ones
      query = {
        $or: [{ assignedOfficer: req.user._id }, { assignedOfficer: null }],
      };
    }

    // Optional status filter
    if (req.query.status) {
      query.status = req.query.status;
    }

    const applications = await Application.find(query)
      .populate('applicant', 'name email phone')
      .populate('business', 'businessName businessType district state')
      .populate('instrument', 'instrumentType manufacturer model serialNumber capacity unit location premisesDescription')
      .populate('assignedOfficer', 'name email phone')
      .populate('assignedOfficerProfile', 'officeName officeAddress district state serviceRadius availabilityStatus location')
      .populate('payment')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, applications, 'Applications retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get single application details with related documents, inspection, certificate, and payment receipt
 * @route  GET /api/applications/:id
 * @access Private
 */
const getApplicationById = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('applicant', 'name email phone')
      .populate('business')
      .populate('instrument')
      .populate('assignedOfficer', 'name email phone')
      .populate('assignedOfficerProfile', 'officeName officeAddress district state serviceRadius availabilityStatus location')
      .populate('payment');

    if (!application) {
      return ApiResponse.error(res, 'Application not found', 404);
    }

    // Check authorization: applicants can only view their own
    if (
      req.user.role === 'applicant' &&
      application.applicant._id.toString() !== req.user._id.toString()
    ) {
      return ApiResponse.error(res, 'Not authorized to view this application', 403);
    }

    // Fetch attached documents
    const documents = await Document.find({ application: application._id }).sort({ uploadedAt: -1 });

    // Fetch inspection record if exists
    const inspection = await Inspection.findOne({ application: application._id })
      .populate('officer', 'name email')
      .sort({ createdAt: -1 });

    // Fetch certificate if issued
    const certificate = await Certificate.findOne({ application: application._id })
      .populate('issuedBy', 'name email');

    // Fetch payment if not already populated
    let payment = application.payment;
    if (!payment) {
      payment = await Payment.findOne({ application: application._id })
        .populate('instrument')
        .populate('business');
    }

    return ApiResponse.success(
      res,
      {
        application,
        documents,
        inspection,
        certificate,
        payment,
      },
      'Application details retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update application (e.g. update remarks or draft details)
 * @route  PUT /api/applications/:id
 * @access Private
 */
const updateApplication = async (req, res, next) => {
  try {
    let application = await Application.findById(req.params.id);
    if (!application) {
      return ApiResponse.error(res, 'Application not found', 404);
    }

    application = await Application.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    return ApiResponse.success(res, application, 'Application updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Upload document for an application
 * @route  POST /api/documents/upload
 * @access Private
 */
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'Please select a document file to upload', 400);
    }

    const { applicationId, documentType } = req.body;

    const fileUrl = `/uploads/documents/${req.file.filename}`;

    const document = await Document.create({
      application: applicationId,
      documentType: documentType || 'INVOICE',
      fileUrl,
      fileName: req.file.originalname,
      uploadedBy: req.user._id,
      verificationStatus: 'PENDING',
    });

    // If application was in SUBMITTED state, move to DOCUMENT_VERIFICATION
    const app = await Application.findById(applicationId);
    if (app && app.status === 'SUBMITTED') {
      const prev = app.status;
      app.status = 'DOCUMENT_VERIFICATION';
      await app.save();

      await logAction({
        user: req.user._id,
        action: 'DOCUMENT_UPLOADED',
        entityType: 'Application',
        entityId: app._id,
        previousStatus: prev,
        newStatus: 'DOCUMENT_VERIFICATION',
        description: `Document '${req.file.originalname}' uploaded for verification`,
      });
    }

    return ApiResponse.success(res, document, 'Document uploaded successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get documents for a specific application
 * @route  GET /api/applications/:id/documents
 * @access Private
 */
const getApplicationDocuments = async (req, res, next) => {
  try {
    const documents = await Document.find({ application: req.params.id }).sort({ uploadedAt: -1 });
    return ApiResponse.success(res, documents, 'Documents retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Applicant dashboard statistics
 * @route  GET /api/applications/stats/applicant
 * @access Private (Applicant)
 */
const getApplicantStats = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    const businessId = business ? business._id : null;

    const totalInstruments = businessId ? await Instrument.countDocuments({ business: businessId }) : 0;
    const activeApplications = await Application.countDocuments({
      applicant: req.user._id,
      status: { $nin: ['CERTIFICATE_ISSUED', 'REJECTED', 'EXPIRED', 'CANCELLED'] },
    });
    const pendingApplications = await Application.countDocuments({
      applicant: req.user._id,
      status: { $in: ['SUBMITTED', 'DOCUMENT_VERIFICATION', 'APPROVED_FOR_INSPECTION'] },
    });
    const completedApplications = await Application.countDocuments({
      applicant: req.user._id,
      status: 'CERTIFICATE_ISSUED',
    });
    const validCertificates = businessId
      ? await Certificate.countDocuments({
          business: businessId,
          status: 'VALID',
          validUntil: { $gte: new Date() },
        })
      : 0;

    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiringCertificates = businessId
      ? await Certificate.countDocuments({
          business: businessId,
          status: 'VALID',
          validUntil: { $gte: new Date(), $lte: thirtyDaysFromNow },
        })
      : 0;

    return ApiResponse.success(
      res,
      {
        totalInstruments,
        activeApplications,
        pendingApplications,
        completedApplications,
        validCertificates,
        expiringCertificates,
      },
      'Applicant stats loaded'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Trigger automatic nearest officer allocation
 * @route  POST /api/applications/:id/allocate
 * @access Private (Admin / Officer / Applicant)
 */
const allocateApplication = async (req, res, next) => {
  try {
    const result = await allocateNearestOfficer(req.params.id);
    return ApiResponse.success(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Admin manually reassigns officer with mandatory reason
 * @route  POST /api/applications/:id/reallocate
 * @access Private (Admin)
 */
const reallocateApplication = async (req, res, next) => {
  try {
    const { officerId, reason } = req.body;
    if (!officerId) {
      return ApiResponse.error(res, 'Please select an officer for reassignment', 400);
    }
    if (!reason || reason.trim().length < 5) {
      return ApiResponse.error(
        res,
        'A valid reason for manual officer reassignment is required (minimum 5 characters)',
        400
      );
    }

    const result = await reassignOfficerManually({
      applicationId: req.params.id,
      officerUserId: officerId,
      reason,
      adminUserId: req.user._id,
    });

    return ApiResponse.success(res, result, 'Officer successfully reassigned');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get allocation options and eligible officers with distances
 * @route  GET /api/applications/:id/allocation
 * @access Private
 */
const getApplicationAllocation = async (req, res, next) => {
  try {
    const data = await getEligibleOfficersForApplication(req.params.id);
    return ApiResponse.success(res, data, 'Allocation options retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update application verification location and re-trigger allocation
 * @route  PUT /api/applications/:id/location
 * @access Private (Applicant / Admin)
 */
const updateApplicationLocation = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return ApiResponse.error(res, 'Application not found', 404);
    }

    // Authorization check: only owner applicant or admin can modify
    if (req.user.role === 'applicant' && application.applicant.toString() !== req.user._id.toString()) {
      return ApiResponse.error(res, 'Not authorized to modify this application verification location', 403);
    }

    const { address, coordinates } = req.body;
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return ApiResponse.error(res, 'Valid coordinates [longitude, latitude] are required', 400);
    }

    application.verificationLocation = {
      ...(address || {}),
      location: {
        type: 'Point',
        coordinates: [parseFloat(coordinates[0]), parseFloat(coordinates[1])],
      },
    };
    application.allocationStatus = 'WAITING_FOR_ALLOCATION';
    await application.save();

    // Trigger automatic nearest allocation with new location
    const allocResult = await allocateNearestOfficer(application._id);

    return ApiResponse.success(
      res,
      { application, allocation: allocResult },
      'Verification location updated and officer allocation calculated'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  uploadDocument,
  getApplicationDocuments,
  getApplicantStats,
  allocateApplication,
  reallocateApplication,
  getApplicationAllocation,
  updateApplicationLocation,
};
