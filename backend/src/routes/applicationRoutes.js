const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(protect);

router.get('/', getApplications);
router.post('/', authorize('applicant', 'admin'), createApplication);
router.get('/stats/applicant', authorize('applicant'), getApplicantStats);
router.get('/:id', getApplicationById);
router.put('/:id', updateApplication);
router.post('/documents/upload', upload.single('document'), uploadDocument);
router.get('/:id/documents', getApplicationDocuments);

// Geospatial Allocation Endpoints
router.post('/:id/allocate', allocateApplication);
router.post('/:id/reallocate', authorize('admin'), reallocateApplication);
router.get('/:id/allocation', getApplicationAllocation);
router.put('/:id/location', authorize('applicant', 'admin'), updateApplicationLocation);

module.exports = router;
