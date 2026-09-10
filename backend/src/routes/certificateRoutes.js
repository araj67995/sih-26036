const express = require('express');
const router = express.Router();
const {
  getCertificates,
  getCertificateById,
  downloadCertificate,
} = require('../controllers/certificateController');
const { protect } = require('../middleware/authMiddleware');

// Public download route
router.get('/:id/download', downloadCertificate);

// Protected certificate listing and details
router.use(protect);
router.get('/', getCertificates);
router.get('/:id', getCertificateById);

module.exports = router;
