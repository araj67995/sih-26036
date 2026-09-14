const express = require('express');
const router = express.Router();
const {
  getMyBusiness,
  createBusiness,
  updateBusiness,
  updateBusinessAddress,
} = require('../controllers/businessController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getMyBusiness);
router.post('/', authorize('applicant', 'admin'), createBusiness);
router.put('/address', authorize('applicant', 'admin'), updateBusinessAddress);
router.put('/:id', authorize('applicant', 'admin'), updateBusiness);

module.exports = router;
