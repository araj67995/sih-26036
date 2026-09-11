const express = require('express');
const router = express.Router();
const {
  getAssignedApplications,
  getOfficerApplicationById,
  reviewApplication,
  scheduleInspection,
  approveApplication,
  rejectApplication,
  getOfficerStats,
  updateDocumentStatus,
} = require('../controllers/officerController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('officer', 'admin'));

router.get('/applications', getAssignedApplications);
router.get('/applications/:id', getOfficerApplicationById);
router.put('/applications/:id/review', reviewApplication);
router.put('/applications/:id/schedule', scheduleInspection);
router.post('/applications/:id/approve', approveApplication);
router.post('/applications/:id/reject', rejectApplication);
router.put('/documents/:id/status', updateDocumentStatus);
router.get('/stats', getOfficerStats);

module.exports = router;
