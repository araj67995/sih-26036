const express = require('express');
const router = express.Router();
const { verifyCertificate } = require('../controllers/certificateController');

// GET /api/verify/:certificateNumber - Publicly accessible without authentication
router.get('/:certificateNumber', verifyCertificate);

module.exports = router;
