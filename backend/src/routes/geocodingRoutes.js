const express = require('express');
const router = express.Router();
const { geocode, reverse } = require('../controllers/geocodingController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/geocode', geocode);
router.post('/reverse', reverse);

module.exports = router;
