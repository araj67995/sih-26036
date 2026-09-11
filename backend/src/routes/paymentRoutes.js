const express = require('express');
const router = express.Router();
const {
  calculateFee,
  processPayment,
  getReceiptByApplicationId,
  getPaymentById,
  downloadReceiptPDF,
  getMyPayments,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public / direct receipt PDF download by ID or receiptNumber
router.get('/:id/receipt/download', downloadReceiptPDF);
router.get('/receipt/:id/download', downloadReceiptPDF);

// Protected routes
router.use(protect);

router.post('/calculate', calculateFee);
router.post('/process', authorize('applicant', 'admin'), processPayment);
router.get('/application/:applicationId', getReceiptByApplicationId);
router.get('/my-payments', authorize('applicant'), getMyPayments);
router.get('/:id', getPaymentById);

module.exports = router;
