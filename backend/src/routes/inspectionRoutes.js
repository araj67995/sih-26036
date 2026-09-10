const express = require('express');
const router = express.Router();
const { recordInspection, getInspectionById, updateInspection } = require('../controllers/inspectionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', authorize('officer', 'admin'), recordInspection);
router.get('/:id', getInspectionById);
router.put('/:id', authorize('officer', 'admin'), updateInspection);

module.exports = router;
