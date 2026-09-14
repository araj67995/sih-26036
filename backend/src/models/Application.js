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
    assignedOfficerProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Officer',
      default: null,
    },
    // Verification location snapshot for this application
    verificationLocation: {
      addressLine1: { type: String, trim: true },
      addressLine2: { type: String, trim: true },
      locality: { type: String, trim: true },
      landmark: { type: String, trim: true },
      city: { type: String, trim: true },
      district: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, default: 'India', trim: true },
      pincode: { type: String, trim: true },
      formattedAddress: { type: String, trim: true },
      location: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          validate: {
            validator: function (val) {
              if (!val || val.length === 0) return true;
              return (
                Array.isArray(val) &&
                val.length === 2 &&
                val[0] >= -180 &&
                val[0] <= 180 &&
                val[1] >= -90 &&
                val[1] <= 90
              );
            },
            message: 'Coordinates must be [longitude (-180 to 180), latitude (-90 to 90)]',
          },
        },
      },
    },
    // Distance between instrument verification location and assigned officer's office (in meters)
    allocationDistance: {
      type: Number,
      default: null,
    },
    // Allocation method: "AUTO_NEAREST" or "MANUAL"
    allocationMethod: {
      type: String,
      enum: ['AUTO_NEAREST', 'MANUAL'],
      default: null,
    },
    // Allocation lifecycle status
    allocationStatus: {
      type: String,
      enum: ['ALLOCATED', 'WAITING_FOR_ALLOCATION', 'LOCATION_REQUIRED'],
      default: 'WAITING_FOR_ALLOCATION',
      index: true,
    },
    allocatedAt: {
      type: Date,
      default: null,
    },
    // Complete audit history of manual or automated officer reassignments
    reassignmentHistory: [
      {
        oldOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        newOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String, required: true },
        admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
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
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'EXEMPTED'],
      default: 'PAID',
      index: true,
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

// Middleware to ensure verificationLocation.location is completely undefined if valid coordinates are not provided
// This prevents MongoDB 2dsphere index from failing with "Can't extract geo keys: Point must be an array or object"
function sanitizeAppLocation(doc) {
  if (!doc || !doc.verificationLocation) return;
  const loc = doc.verificationLocation.location;
  if (
    !loc ||
    !loc.coordinates ||
    !Array.isArray(loc.coordinates) ||
    loc.coordinates.length !== 2 ||
    loc.coordinates[0] === null ||
    loc.coordinates[0] === undefined ||
    isNaN(loc.coordinates[0]) ||
    loc.coordinates[1] === null ||
    loc.coordinates[1] === undefined ||
    isNaN(loc.coordinates[1])
  ) {
    doc.verificationLocation.location = undefined;
  } else {
    doc.verificationLocation.location.type = 'Point';
  }
}

applicationSchema.pre('validate', function (next) {
  sanitizeAppLocation(this);
  next();
});

applicationSchema.pre('save', function (next) {
  sanitizeAppLocation(this);
  next();
});

applicationSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
  const update = this.getUpdate();
  if (!update) return next();

  const sanitizeObj = (obj) => {
    if (!obj) return;
    if (obj['verificationLocation.location']) {
      const loc = obj['verificationLocation.location'];
      if (
        !loc.coordinates ||
        !Array.isArray(loc.coordinates) ||
        loc.coordinates.length !== 2 ||
        loc.coordinates[0] === null ||
        loc.coordinates[0] === undefined ||
        isNaN(loc.coordinates[0]) ||
        loc.coordinates[1] === null ||
        loc.coordinates[1] === undefined ||
        isNaN(loc.coordinates[1])
      ) {
        delete obj['verificationLocation.location'];
        if (!update.$unset) update.$unset = {};
        update.$unset['verificationLocation.location'] = '';
      } else {
        loc.type = 'Point';
      }
    } else if (obj.verificationLocation && obj.verificationLocation.location) {
      const loc = obj.verificationLocation.location;
      if (
        !loc.coordinates ||
        !Array.isArray(loc.coordinates) ||
        loc.coordinates.length !== 2 ||
        loc.coordinates[0] === null ||
        loc.coordinates[0] === undefined ||
        isNaN(loc.coordinates[0]) ||
        loc.coordinates[1] === null ||
        loc.coordinates[1] === undefined ||
        isNaN(loc.coordinates[1])
      ) {
        delete obj.verificationLocation.location;
        if (!update.$unset) update.$unset = {};
        update.$unset['verificationLocation.location'] = '';
      } else {
        loc.type = 'Point';
      }
    }
  };

  sanitizeObj(update);
  if (update.$set) sanitizeObj(update.$set);
  next();
});

// Compound indexes for fast applicant and officer dashboard queries
applicationSchema.index({ applicant: 1, status: 1 });
applicationSchema.index({ assignedOfficer: 1, status: 1 });
applicationSchema.index({ 'verificationLocation.location': '2dsphere' }, { sparse: true });

const Application = mongoose.models.Application || mongoose.model('Application', applicationSchema);

module.exports = Application;

