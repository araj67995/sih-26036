const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    applicationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Application must be linked to an applicant user'],
      index: true,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Application must be linked to a registered business'],
      index: true,
    },
    instrument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Instrument',
      required: [true, 'Application must specify the instrument being verified'],
      index: true,
    },
    applicationType: {
      type: String,
      enum: ['INITIAL', 'RE_VERIFICATION', 'RENEWAL'],
      default: 'INITIAL',
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: [
          'DRAFT',
          'SUBMITTED',
          'DOCUMENT_VERIFICATION',
          'DOCUMENT_REJECTED',
          'APPROVED_FOR_INSPECTION',
          'INSPECTION_SCHEDULED',
          'INSPECTION_COMPLETED',
          'APPROVED',
          'REJECTED',
          'CERTIFICATE_ISSUED',
          'EXPIRED',
          'CANCELLED',
        ],
        message: '{VALUE} is not a valid Legal Metrology application status',
      },
      default: 'SUBMITTED',
      index: true,
    },
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    inspectionDate: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast applicant and officer dashboard queries
applicationSchema.index({ applicant: 1, status: 1 });
applicationSchema.index({ assignedOfficer: 1, status: 1 });

const Application = mongoose.models.Application || mongoose.model('Application', applicationSchema);

module.exports = Application;
