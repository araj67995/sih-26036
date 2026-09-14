const express = require('express');
const router = express.Router();
const {
  getNearbyOfficers,
  getAllOfficers,
  getOfficerById,
  updateOfficerLocation,
  updateMyAvailability,
} = require('../controllers/officerLocationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/nearby', authorize('admin', 'officer'), getNearbyOfficers);
router.get('/', authorize('admin', 'officer'), getAllOfficers);
router.get('/:id', authorize('admin', 'officer'), getOfficerById);
router.put('/:id/location', authorize('admin'), updateOfficerLocation);
router.put('/me/availability', authorize('officer'), updateMyAvailability);

module.exports = router;
