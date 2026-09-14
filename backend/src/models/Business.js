const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Business must belong to a registered user'],
      index: true,
    },
    businessName: {
      type: String,
      required: [true, 'Please provide registered business / trade name'],
      trim: true,
      maxlength: [150, 'Business name cannot exceed 150 characters'],
    },
    businessType: {
      type: String,
      required: [true, 'Please select a business category'],
      trim: true,
      enum: [
        'Retailer / Trader',
        'Manufacturer',
        'Authorized Dealer',
        'Repairer / Service Center',
        'Importer',
        'Logistics & Warehousing',
        'Other',
      ],
      default: 'Retailer / Trader',
    },
    address: {
      type: String,
      required: [true, 'Please provide business registered address'],
      trim: true,
    },
    district: {
      type: String,
      required: [true, 'Please provide district'],
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: [true, 'Please provide state / union territory'],
      trim: true,
      index: true,
    },
    pincode: {
      type: String,
      required: [true, 'Please provide 6-digit postal pincode'],
      trim: true,
      match: [/^[1-9][0-9]{5}$/, 'Please provide a valid 6-digit Indian PIN code'],
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      match: [
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        'Please provide a valid 15-character GSTIN format or leave blank',
      ],
    },
    contactNumber: {
      type: String,
      required: [true, 'Please provide official contact telephone / mobile number'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide official business communication email'],
      trim: true,
      lowercase: true,
    },
    // Structured Verification Location details
    addressLine1: {
      type: String,
      trim: true,
    },
    addressLine2: {
      type: String,
      trim: true,
    },
    locality: {
      type: String,
      trim: true,
    },
    landmark: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      default: 'India',
      trim: true,
    },
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
    isLocationConfirmed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware to ensure location is completely undefined if valid coordinates are not provided
// This prevents MongoDB 2dsphere index from failing with "Can't extract geo keys: Point must be an array or object"
function sanitizeLocationDoc(doc) {
  if (!doc) return;
  const loc = doc.location;
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
    doc.location = undefined;
  } else {
    doc.location.type = 'Point';
  }
}

businessSchema.pre('validate', function (next) {
  sanitizeLocationDoc(this);
  next();
});

businessSchema.pre('save', function (next) {
  sanitizeLocationDoc(this);
  next();
});

businessSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
  const update = this.getUpdate();
  if (!update) return next();

  const sanitizeObj = (obj) => {
    if (!obj || !obj.location) return;
    const loc = obj.location;
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
      delete obj.location;
      if (!update.$unset) update.$unset = {};
      update.$unset.location = '';
    } else {
      loc.type = 'Point';
    }
  };

  sanitizeObj(update);
  if (update.$set) sanitizeObj(update.$set);
  next();
});

businessSchema.index({ location: '2dsphere' }, { sparse: true });

const Business = mongoose.models.Business || mongoose.model('Business', businessSchema);

module.exports = Business;

