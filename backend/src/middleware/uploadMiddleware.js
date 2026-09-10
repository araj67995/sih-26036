const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure destination directories exist
const uploadBase = path.join(__dirname, '..', 'uploads');
const docsDir = path.join(uploadBase, 'documents');
const certsDir = path.join(uploadBase, 'certificates');
const evidenceDir = path.join(uploadBase, 'evidence');

[uploadBase, docsDir, certsDir, evidenceDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'evidence') {
      cb(null, evidenceDir);
    } else {
      cb(null, docsDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter (Allowed: PDF, JPG, JPEG, PNG)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error('Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed.'),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter,
});

module.exports = upload;
