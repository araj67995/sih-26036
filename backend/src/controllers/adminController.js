const { User, Application, Certificate, Inspection, AuditLog, TestCentre, Business, Instrument } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { logAction } = require('../services/auditService');

/**
 * @desc   Admin dashboard metrics and summary statistics
 * @route  GET /api/admin/dashboard
 * @access Private (Admin)
 */
const getAdminDashboardStats = async (req, res, next) => {
  try {
    const totalApplicants = await User.countDocuments({ role: 'applicant' });
    const totalOfficers = await User.countDocuments({ role: 'officer' });
    const totalApplications = await Application.countDocuments();
    const pendingApplications = await Application.countDocuments({
      status: { $in: ['SUBMITTED', 'DOCUMENT_VERIFICATION', 'APPROVED_FOR_INSPECTION', 'INSPECTION_SCHEDULED'] },
    });
    const approvedApplications = await Application.countDocuments({
      status: { $in: ['APPROVED', 'CERTIFICATE_ISSUED'] },
    });
    const rejectedApplications = await Application.countDocuments({
      status: { $in: ['REJECTED', 'DOCUMENT_REJECTED'] },
    });
    const certificatesIssued = await Certificate.countDocuments({ status: 'VALID' });

    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiringCertificates = await Certificate.countDocuments({
      status: 'VALID',
      validUntil: { $gte: new Date(), $lte: thirtyDaysFromNow },
    });

    // Monthly applications distribution (last 6 months) for Recharts
    const statusBreakdown = [
      { name: 'Pending Review', count: pendingApplications, color: '#f59e0b' },
      { name: 'Approved / Certified', count: approvedApplications, color: '#10b981' },
      { name: 'Rejected', count: rejectedApplications, color: '#ef4444' },
      { name: 'Valid Certificates', count: certificatesIssued, color: '#3b82f6' },
    ];

    return ApiResponse.success(
      res,
      {
        totalApplicants,
        totalOfficers,
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        certificatesIssued,
        expiringCertificates,
        statusBreakdown,
      },
      'Admin dashboard statistics loaded'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get all users with optional role and status filters
 * @route  GET /api/admin/users
 * @access Private (Admin)
 */
const getAllUsers = async (req, res, next) => {
  try {
    let query = {};
    if (req.query.role) query.role = req.query.role;
    if (req.query.status) query.status = req.query.status;

    const users = await User.find(query).sort({ createdAt: -1 });
    return ApiResponse.success(res, users, 'Users retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update user status (active / suspended / inactive) or role
 * @route  PUT /api/admin/users/:id/status
 * @access Private (Admin)
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { status, role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return ApiResponse.error(res, 'User not found', 404);
    }

    if (status) user.status = status;
    if (role) user.role = role;
    await user.save();

    await logAction({
      user: req.user._id,
      action: 'USER_STATUS_UPDATED',
      entityType: 'User',
      entityId: user._id,
      description: `Admin updated user ${user.name} status to ${status || user.status}`,
    });

    return ApiResponse.success(res, user, 'User updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get all applications across the entire system
 * @route  GET /api/admin/applications
 * @access Private (Admin)
 */
const getAllApplications = async (req, res, next) => {
  try {
    let query = {};
    if (req.query.status) query.status = req.query.status;

    const applications = await Application.find(query)
      .populate('applicant', 'name email phone')
      .populate('business', 'businessName district state')
      .populate('instrument', 'instrumentType manufacturer model serialNumber')
      .populate('assignedOfficer', 'name email phone')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, applications, 'All applications retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Assign or reassign an application to a Legal Metrology Officer
 * @route  PUT /api/admin/applications/:id/assign
 * @access Private (Admin)
 */
const assignOfficerToApplication = async (req, res, next) => {
  try {
    const { officerId, remarks } = req.body;
    const application = await Application.findById(req.params.id);

    if (!application) {
      return ApiResponse.error(res, 'Application not found', 404);
    }

    const officer = await User.findOne({ _id: officerId, role: 'officer' });
    if (!officer) {
      return ApiResponse.error(res, 'Specified officer was not found or is not an active officer', 400);
    }

    const previousOfficer = application.assignedOfficer;
    application.assignedOfficer = officer._id;
    if (remarks) application.remarks = remarks;
    await application.save();

    await logAction({
      user: req.user._id,
      action: 'OFFICER_ASSIGNED',
      entityType: 'Application',
      entityId: application._id,
      description: `Admin assigned application ${application.applicationNumber} to Officer ${officer.name}`,
    });

    return ApiResponse.success(res, application, `Application assigned to Officer ${officer.name}`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get audit logs
 * @route  GET /api/admin/audit-logs
 * @access Private (Admin)
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const auditLogs = await AuditLog.find()
      .populate('user', 'name email role')
      .sort({ timestamp: -1 })
      .limit(limit);

    return ApiResponse.success(res, auditLogs, 'Audit logs retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Cancel a verification certificate with audit log
 * @route  PUT /api/admin/certificates/:id/cancel
 * @access Private (Admin)
 */
const cancelCertificate = async (req, res, next) => {
  try {
    const { cancellationReason } = req.body;
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return ApiResponse.error(res, 'Certificate not found', 404);
    }

    const prevStatus = certificate.status;
    certificate.status = 'CANCELLED';
    await certificate.save();

    // Update Application status
    await Application.findByIdAndUpdate(certificate.application, {
      status: 'CANCELLED',
      rejectionReason: cancellationReason || 'Certificate cancelled by Central Administrator',
    });

    // Update Instrument status
    await Instrument.findByIdAndUpdate(certificate.instrument, { status: 'REJECTED' });

    await logAction({
      user: req.user._id,
      action: 'CERTIFICATE_CANCELLED',
      entityType: 'Certificate',
      entityId: certificate._id,
      previousStatus: prevStatus,
      newStatus: 'CANCELLED',
      description: `Certificate ${certificate.certificateNumber} CANCELLED by Admin. Reason: ${cancellationReason || 'Administrative revocation'}`,
    });

    return ApiResponse.success(res, certificate, 'Certificate successfully cancelled');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get test centres
 * @route  GET /api/admin/test-centres
 * @access Private (Admin / Officer)
 */
const getTestCentres = async (req, res, next) => {
  try {
    const centres = await TestCentre.find().populate('officer', 'name email phone').sort({ state: 1, district: 1 });
    return ApiResponse.success(res, centres, 'Test centres loaded');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Create test centre
 * @route  POST /api/admin/test-centres
 * @access Private (Admin)
 */
const createTestCentre = async (req, res, next) => {
  try {
    const centre = await TestCentre.create(req.body);
    return ApiResponse.success(res, centre, 'Test centre added successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Verification compliance reports
 * @route  GET /api/admin/reports
 * @access Private (Admin)
 */
const getAdminReports = async (req, res, next) => {
  try {
    // District-wise statistics
    const districtStats = await Application.aggregate([
      {
        $lookup: {
          from: 'businesses',
          localField: 'business',
          foreignField: '_id',
          as: 'businessDetails',
        },
      },
      { $unwind: '$businessDetails' },
      {
        $group: {
          _id: '$businessDetails.district',
          total: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'CERTIFICATE_ISSUED'] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] },
          },
          pending: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$status',
                    ['SUBMITTED', 'DOCUMENT_VERIFICATION', 'APPROVED_FOR_INSPECTION', 'INSPECTION_SCHEDULED'],
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Instrument category distribution
    const categoryStats = await Instrument.aggregate([
      {
        $group: {
          _id: '$instrumentType',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return ApiResponse.success(
      res,
      { districtStats, categoryStats },
      'Reports loaded successfully'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminDashboardStats,
  getAllUsers,
  updateUserStatus,
  getAllApplications,
  assignOfficerToApplication,
  getAuditLogs,
  cancelCertificate,
  getTestCentres,
  createTestCentre,
  getAdminReports,
};
