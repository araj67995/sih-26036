const mongoose = require('mongoose');

const instrumentSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Instrument must be registered under a business'],
      index: true,
    },
    instrumentType: {
      type: String,
      required: [true, 'Please specify instrument category / type'],
      trim: true,
      enum: [
        'Non-Automatic Weighing Instrument (NAWI)',
        'Automatic Weighing Instrument (AWI)',
        'Electronic Counter Scale',
        'Electronic Platform Scale',
        'Weighbridge / Heavy Capacity Scale',
        'Precision / Analytical Balance (Class I/II)',
        'Fuel Dispensing Unit / Flow Meter',
        'Linear Measuring Instrument (Tape/Scale)',
        'Capacity Measure / Storage Tank',
        'Other Measuring Device',
      ],
      default: 'Electronic Counter Scale',
    },
    manufacturer: {
      type: String,
      required: [true, 'Please provide manufacturer name'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'Please provide model number / designation'],
      trim: true,
    },
    serialNumber: {
      type: String,
      required: [true, 'Please provide unique manufacturer serial number stamped on the instrument'],
      trim: true,
      index: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Please provide maximum rated instrument capacity'],
      min: [0.001, 'Capacity must be greater than zero'],
    },
    unit: {
      type: String,
      required: [true, 'Please provide measurement unit'],
      enum: ['mg', 'g', 'kg', 'ton', 'mL', 'L', 'kL', 'mm', 'cm', 'm'],
      default: 'kg',
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    // Descriptive location within premises (e.g. "Counter 1 (Billing)")
    premisesDescription: {
      type: String,
      trim: true,
      default: '',
    },
    // Structured Physical Verification Address
    verificationAddress: {
      addressLine1: { type: String, trim: true },
      addressLine2: { type: String, trim: true },
      locality: { type: String, trim: true },
      landmark: { type: String, trim: true },
      city: { type: String, trim: true },
      district: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, default: 'India', trim: true },
      pincode: {
        type: String,
        trim: true,
        match: [/^[1-9][0-9]{5}$/, 'Please provide a valid 6-digit Indian PIN code'],
      },
      formattedAddress: { type: String, trim: true },
    },
    // GeoJSON Point location for geospatial nearest-officer queries
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
    useBusinessAddress: {
      type: Boolean,
      default: true,
    },
    isLocationConfirmed: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['REGISTERED', 'VERIFICATION_PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'],
      default: 'REGISTERED',
      index: true,
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

instrumentSchema.pre('validate', function (next) {
  sanitizeLocationDoc(this);
  next();
});

instrumentSchema.pre('save', function (next) {
  sanitizeLocationDoc(this);
  next();
});

instrumentSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
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

instrumentSchema.index({ location: '2dsphere' }, { sparse: true });

// Compound index to prevent duplicate serial numbers within the same manufacturer
instrumentSchema.index({ manufacturer: 1, serialNumber: 1 });

const Instrument = mongoose.models.Instrument || mongoose.model('Instrument', instrumentSchema);

module.exports = Instrument;

