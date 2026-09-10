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
    location: {
      type: String,
      required: [true, 'Please specify physical location / premises where instrument is in active use'],
      trim: true,
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

// Compound index to prevent duplicate serial numbers within the same manufacturer
instrumentSchema.index({ manufacturer: 1, serialNumber: 1 });

const Instrument = mongoose.models.Instrument || mongoose.model('Instrument', instrumentSchema);

module.exports = Instrument;
