const path = require('path');
const fs = require('fs');
const { Certificate, Application, Business, Instrument } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { logAction } = require('../services/auditService');
const { generateCertificatePDF } = require('../services/pdfService');

/**
 * @desc   Get certificates (filtered for applicant's business or all for admin/officer)
 * @route  GET /api/certificates
 * @access Private
 */
const getCertificates = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'applicant') {
      const business = await Business.findOne({ owner: req.user._id });
      if (!business) {
        return ApiResponse.success(res, []);
      }
      query.business = business._id;
    }

    const certificates = await Certificate.find(query)
      .populate('instrument')
      .populate('business', 'businessName businessType district state')
      .populate('issuedBy', 'name email')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, certificates, 'Certificates retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get single certificate by ID
 * @route  GET /api/certificates/:id
 * @access Private
 */
const getCertificateById = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('instrument')
      .populate('business')
      .populate('application')
      .populate('issuedBy', 'name email phone');

    if (!certificate) {
      return ApiResponse.error(res, 'Certificate not found', 404);
    }

    return ApiResponse.success(res, certificate, 'Certificate retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Download certificate PDF file
 * @route  GET /api/certificates/:id/download
 * @access Public / Private
 */
const downloadCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      return ApiResponse.error(res, 'Certificate not found', 404);
    }

    const filePath = path.join(__dirname, '..', certificate.pdfUrl);

    if (fs.existsSync(filePath)) {
      return res.download(filePath, `LegalMetrology-Certificate-${certificate.certificateNumber}.pdf`);
    } else {
      return ApiResponse.error(res, 'Certificate PDF file is missing on the server', 404);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Public certificate verification (NO LOGIN REQUIRED)
 * @route  GET /api/verify/:certificateNumber
 * @access Public
 */
const verifyCertificate = async (req, res, next) => {
  try {
    const { certificateNumber } = req.params;

    const certificate = await Certificate.findOne({
      certificateNumber: certificateNumber.trim().toUpperCase(),
    })
      .populate('instrument', 'instrumentType manufacturer model serialNumber capacity unit')
      .populate('business', 'businessName businessType district state')
      .populate('issuedBy', 'name');

    if (!certificate) {
      return ApiResponse.error(
        res,
        'Certificate not found. The provided reference does not match any official Legal Metrology record.',
        404
      );
    }

    // Determine real-time expiration status
    let liveStatus = certificate.status;
    if (certificate.status === 'VALID' && new Date() > new Date(certificate.validUntil)) {
      liveStatus = 'EXPIRED';
    }

    // Safe public data payload (NO sensitive applicant contact numbers, passwords, personal addresses)
    const publicData = {
      certificateNumber: certificate.certificateNumber,
      status: liveStatus,
      isValid: liveStatus === 'VALID',
      issueDate: certificate.issueDate,
      validUntil: certificate.validUntil,
      businessName: certificate.business?.businessName,
      businessDistrict: certificate.business?.district,
      businessState: certificate.business?.state,
      instrument: {
        instrumentType: certificate.instrument?.instrumentType,
        manufacturer: certificate.instrument?.manufacturer,
        model: certificate.instrument?.model,
        serialNumber: certificate.instrument?.serialNumber,
        capacity: certificate.instrument?.capacity,
        unit: certificate.instrument?.unit,
      },
      verifiedBy: certificate.issuedBy?.name,
      pdfDownloadUrl: `/api/certificates/${certificate._id}/download`,
      verificationToken: certificate.verificationToken,
    };

    // Log public audit check
    await logAction({
      user: null,
      action: 'PUBLIC_CERTIFICATE_VERIFIED',
      entityType: 'Certificate',
      entityId: certificate._id,
      description: `Public citizen verified certificate ${certificate.certificateNumber}. Status: ${liveStatus}`,
      ipAddress: req.ip,
    });

    return ApiResponse.success(res, publicData, 'Certificate verification details retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCertificates,
  getCertificateById,
  downloadCertificate,
  verifyCertificate,
};
