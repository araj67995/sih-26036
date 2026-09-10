const express = require('express');
const router = express.Router();
const {
  getInstruments,
  registerInstrument,
  getInstrumentById,
  updateInstrument,
  deleteInstrument,
} = require('../controllers/instrumentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getInstruments);
router.post('/', authorize('applicant', 'admin'), registerInstrument);
router.get('/:id', getInstrumentById);
router.put('/:id', authorize('applicant', 'admin'), updateInstrument);
router.delete('/:id', authorize('applicant', 'admin'), deleteInstrument);

module.exports = router;
