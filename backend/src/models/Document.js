const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: [true, 'Document must be associated with a verification application'],
      index: true,
    },
    documentType: {
      type: String,
      required: [true, 'Please specify document classification'],
      enum: [
        'INVOICE',
        'MODEL_APPROVAL',
        'PREVIOUS_CERTIFICATE',
        'CALIBRATION_REPORT',
        'ID_PROOF',
        'GST_REGISTRATION',
        'OTHER',
      ],
      default: 'INVOICE',
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL path is required'],
    },
    publicId: {
      type: String,
      default: null, // Cloudinary or storage public resource identifier
    },
    fileName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Document = mongoose.models.Document || mongoose.model('Document', documentSchema);

module.exports = Document;
