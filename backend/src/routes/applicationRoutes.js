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

module.exports = router;
