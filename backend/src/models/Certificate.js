const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    certificateNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: [true, 'Certificate must be tied to an approved application'],
      index: true,
    },
    instrument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Instrument',
      required: [true, 'Certificate must reference the verified instrument'],
      index: true,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Certificate must reference the owning establishment'],
      index: true,
    },
    issueDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    validUntil: {
      type: Date,
      required: [true, 'Certificate validity expiration date is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['VALID', 'EXPIRED', 'CANCELLED'],
        message: '{VALUE} is not a valid certificate status',
      },
      default: 'VALID',
      index: true,
    },
    pdfUrl: {
      type: String,
      required: [true, 'Digital PDF certificate URL is required'],
    },
    qrCodeUrl: {
      type: String,
      required: [true, 'QR code verification image URL or DataURI is required'],
    },
    verificationToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Certificate must record the issuing Legal Metrology Officer'],
    },
  },
  {
    timestamps: true,
  }
);

// Virtual property to check if certificate is currently active and not expired
certificateSchema.virtual('isValid').get(function () {
  return this.status === 'VALID' && new Date() <= new Date(this.validUntil);
});

const Certificate = mongoose.models.Certificate || mongoose.model('Certificate', certificateSchema);

module.exports = Certificate;
