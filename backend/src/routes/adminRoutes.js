const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getAdminDashboardStats);
router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);
router.get('/applications', getAllApplications);
router.put('/applications/:id/assign', assignOfficerToApplication);
router.get('/audit-logs', getAuditLogs);
router.put('/certificates/:id/cancel', cancelCertificate);
router.get('/test-centres', getTestCentres);
router.post('/test-centres', createTestCentre);
router.get('/reports', getAdminReports);

module.exports = router;
