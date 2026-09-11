const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { Payment, Application, Business, Instrument, User, Notification } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { logAction } = require('../services/auditService');
const { calculateMachineFee } = require('../utils/feeCalculator');
const { generateReceiptPDF } = require('../services/pdfService');

/**
 * Helper to generate unique receipt number e.g. RCP-2026-84920
 */
const generateReceiptNumber = async () => {
  const year = new Date().getFullYear();
  let num;
  let exists = true;
  while (exists) {
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    num = `RCP-${year}-${randomSuffix}`;
    const found = await Payment.findOne({ receiptNumber: num });
    if (!found) exists = false;
  }
  return num;
};

/**
 * Helper to generate transaction ID e.g. TXN-2026-94827103
 */
const generateTxnId = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(10000000 + Math.random() * 90000000);
  return `TXN-${year}-${random}`;
};

/**
 * Helper to generate application number if new app is created
 */
const generateAppNumber = async () => {
  const year = new Date().getFullYear();
  let num;
  let exists = true;
  while (exists) {
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    num = `APP-${year}-${randomSuffix}`;
    const found = await Application.findOne({ applicationNumber: num });
    if (!found) exists = false;
  }
  return num;
};

/**
 * @desc   Calculate statutory verification fee based on instrument (machine) specs
 * @route  POST /api/payments/calculate
 * @access Private (Applicant, Admin)
 */
const calculateFee = async (req, res, next) => {
  try {
    const { instrumentId, applicationType } = req.body;

    if (!instrumentId) {
      return ApiResponse.error(res, 'Instrument ID is required for fee assessment', 400);
    }

    const instrument = await Instrument.findById(instrumentId);
    if (!instrument) {
      return ApiResponse.error(res, 'Instrument not found', 404);
    }

    const feeBreakdown = calculateMachineFee(instrument, applicationType || 'INITIAL');

    return ApiResponse.success(
      res,
      {
        instrument: {
          _id: instrument._id,
          instrumentType: instrument.instrumentType,
          model: instrument.model,
          manufacturer: instrument.manufacturer,
          serialNumber: instrument.serialNumber,
          capacity: instrument.capacity,
          unit: instrument.unit,
          location: instrument.location,
        },
        feeBreakdown,
      },
      'Statutory verification fee assessed according to machine specifications'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Process payment and generate official receipt for verification application
 * @route  POST /api/payments/process
 * @access Private (Applicant)
 */
const processPayment = async (req, res, next) => {
  try {
    const {
      applicationId,
      instrumentId,
      applicationType = 'INITIAL',
      paymentMethod = 'UPI',
      remarks,
    } = req.body;

    let application = null;
    let instrument = null;
    let business = null;

    if (applicationId) {
      application = await Application.findById(applicationId)
        .populate('instrument')
        .populate('business');

      if (!application) {
        return ApiResponse.error(res, 'Application not found', 404);
      }

      // Authorization check
      if (
        req.user.role === 'applicant' &&
        application.applicant.toString() !== req.user._id.toString()
      ) {
        return ApiResponse.error(res, 'Not authorized to make payment for this application', 403);
      }

      // Check if already paid
      if (application.paymentStatus === 'PAID' && application.payment) {
        const existingPayment = await Payment.findById(application.payment);
        if (existingPayment) {
          return ApiResponse.success(
            res,
            { payment: existingPayment, application },
            'Application already paid. Receipt retrieved.',
            200
          );
        }
      }

      instrument = application.instrument;
      business = application.business;
    } else {
      // Direct application creation + payment in one step
      if (!instrumentId) {
        return ApiResponse.error(res, 'Instrument ID is required', 400);
      }

      instrument = await Instrument.findById(instrumentId);
      if (!instrument) {
        return ApiResponse.error(res, 'Instrument not found', 404);
      }

      business = await Business.findOne({ owner: req.user._id });
      if (!business) {
        return ApiResponse.error(res, 'Business profile not found', 400);
      }

      const availableOfficer = await User.findOne({ role: 'officer', status: 'active' });
      const appNumber = await generateAppNumber();

      application = await Application.create({
        applicationNumber: appNumber,
        applicant: req.user._id,
        business: business._id,
        instrument: instrument._id,
        applicationType: applicationType || 'INITIAL',
        status: 'SUBMITTED',
        paymentStatus: 'PAID',
        assignedOfficer: availableOfficer ? availableOfficer._id : null,
        submittedAt: new Date(),
        remarks: remarks || '',
      });

      // Update instrument status to VERIFICATION_PENDING
      instrument.status = 'VERIFICATION_PENDING';
      await instrument.save();
    }

    // 1. Calculate Statutory Fee according to machine
    const feeBreakdown = calculateMachineFee(instrument, applicationType || application.applicationType);

    // 2. Generate unique Receipt and Transaction Identifiers
    const receiptNumber = await generateReceiptNumber();
    const transactionId = generateTxnId();
    const paidAt = new Date();

    // 3. Generate Official PDF Receipt with embedded QR code
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    let receiptPdfUrl = '';
    try {
      receiptPdfUrl = await generateReceiptPDF({
        receiptNumber,
        transactionId,
        applicationNumber: application.applicationNumber,
        applicationType: application.applicationType || applicationType,
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
        paymentMethod,
        paidAt,
        clientUrl,
      });
    } catch (pdfErr) {
      console.error('PDF generation warning:', pdfErr.message);
    }

    // 4. Save Payment Record in MongoDB
    const payment = await Payment.create({
      receiptNumber,
      transactionId,
      application: application._id,
      applicant: req.user._id,
      business: business._id,
      instrument: instrument._id,
      applicationType: application.applicationType || applicationType,
      feeBreakdown,
      currency: 'INR',
      paymentMethod,
      paymentGateway: 'BharatKosh / Legal Metrology Instant Settlement',
      status: 'PAID',
      paidAt,
      receiptPdfUrl,
      remarks: remarks || 'Statutory verification fee paid successfully',
    });

    // 5. Update Application with payment reference
    application.payment = payment._id;
    application.paymentStatus = 'PAID';
    await application.save();

    // 6. Record Audit Log
    await logAction({
      user: req.user._id,
      action: 'PAYMENT_COMPLETED',
      entityType: 'Application',
      entityId: application._id,
      previousStatus: 'PAYMENT_PENDING',
      newStatus: 'PAID',
      description: `Statutory fee ₹${feeBreakdown.totalAmount} paid for machine ${instrument.model} (SN: ${instrument.serialNumber}). Receipt: ${receiptNumber}`,
      ipAddress: req.ip,
    });

    // 7. Send Notification
    try {
      await Notification.create({
        user: req.user._id,
        recipient: req.user._id,
        title: 'Statutory Fee Payment Successful',
        message: `Payment of ₹${feeBreakdown.totalAmount} received for ${instrument.model} (App: ${application.applicationNumber}). Receipt ${receiptNumber} is ready for download.`,
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
        payment,
        application,
        receipt: {
          receiptNumber,
          transactionId,
          paidAt,
          totalAmount: feeBreakdown.totalAmount,
          receiptPdfUrl,
        },
      },
      'Payment processed successfully and statutory receipt generated',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get receipt details by application ID
 * @route  GET /api/payments/application/:applicationId
 * @access Private
 */
const getReceiptByApplicationId = async (req, res, next) => {
  try {
    const { applicationId } = req.params;

    const payment = await Payment.findOne({ application: applicationId })
      .populate('instrument')
      .populate('business')
      .populate('applicant', 'name email phone')
      .populate('application', 'applicationNumber status applicationType submittedAt');

    if (!payment) {
      return ApiResponse.error(res, 'Payment receipt not found for this application', 404);
    }

    return ApiResponse.success(res, payment, 'Receipt details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get single payment by ID
 * @route  GET /api/payments/:id
 * @access Private
 */
const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('instrument')
      .populate('business')
      .populate('applicant', 'name email phone')
      .populate('application', 'applicationNumber status applicationType submittedAt');

    if (!payment) {
      return ApiResponse.error(res, 'Payment not found', 404);
    }

    return ApiResponse.success(res, payment, 'Payment retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Download official statutory fee receipt PDF
 * @route  GET /api/payments/:id/receipt/download
 * @access Private / Public
 */
const downloadReceiptPDF = async (req, res, next) => {
  try {
    const { id } = req.params;
    let payment = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      payment = await Payment.findById(id)
        .populate('instrument')
        .populate('business')
        .populate('applicant', 'name email phone')
        .populate('application');
    }

    if (!payment) {
      payment = await Payment.findOne({ receiptNumber: id })
        .populate('instrument')
        .populate('business')
        .populate('applicant', 'name email phone')
        .populate('application');
    }

    if (!payment) {
      return ApiResponse.error(res, 'Payment receipt record not found', 404);
    }

    const receiptsDir = path.join(__dirname, '..', 'uploads', 'receipts');
    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }

    const fileName = `Receipt-${payment.receiptNumber}.pdf`;
    const filePath = path.join(receiptsDir, fileName);

    // Regenerate on-the-fly if missing on disk
    if (!fs.existsSync(filePath)) {
      const business = payment.business || {};
      const instrument = payment.instrument || {};
      const applicant = payment.applicant || {};
      const application = payment.application || {};

      await generateReceiptPDF({
        receiptNumber: payment.receiptNumber,
        transactionId: payment.transactionId,
        applicationNumber: application.applicationNumber || 'APP-LM',
        applicationType: payment.applicationType || 'INITIAL',
        businessName: business.businessName || 'Business Establishment',
        businessAddress: `${business.address || ''}, ${business.district || ''}, ${business.state || ''} - ${business.pincode || ''}`,
        applicantName: applicant.name || 'Applicant',
        applicantPhone: applicant.phone || '',
        applicantEmail: applicant.email || '',
        gstNumber: business.gstNumber || 'N/A',
        instrumentType: instrument.instrumentType,
        manufacturer: instrument.manufacturer,
        model: instrument.model,
        serialNumber: instrument.serialNumber,
        capacity: instrument.capacity,
        unit: instrument.unit,
        location: instrument.location,
        feeBreakdown: payment.feeBreakdown,
        paymentMethod: payment.paymentMethod,
        paidAt: payment.paidAt || payment.createdAt,
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get applicant's payments history
 * @route  GET /api/payments/my-payments
 * @access Private (Applicant)
 */
const getMyPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ applicant: req.user._id })
      .populate('instrument', 'model serialNumber instrumentType capacity unit')
      .populate('application', 'applicationNumber status')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, payments, 'Payments retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  calculateFee,
  processPayment,
  getReceiptByApplicationId,
  getPaymentById,
  downloadReceiptPDF,
  getMyPayments,
};
