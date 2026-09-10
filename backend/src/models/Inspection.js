const mongoose = require('mongoose');

const inspectionSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: [true, 'Inspection must correspond to an application'],
      index: true,
    },
    officer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Inspection must be executed by an authorized officer'],
      index: true,
    },
    inspectionDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    instrumentCondition: {
      type: String,
      enum: ['SATISFACTORY', 'UNSATISFACTORY', 'DAMAGED'],
      default: 'SATISFACTORY',
      required: true,
    },
    serialNumberVerified: {
      type: Boolean,
      default: true,
      required: true,
    },
    sealCondition: {
      type: String,
      enum: ['INTACT', 'BROKEN', 'TAMPERED', 'NOT_APPLICABLE'],
      default: 'INTACT',
      required: true,
    },
    standardWeight: {
      type: Number,
      required: [true, 'Certified standard/reference weight value is required'],
    },
    observedReading: {
      type: Number,
      required: [true, 'Observed instrument reading is required'],
    },
    error: {
      type: Number,
      required: true,
    },
    permissibleError: {
      type: Number,
      required: [true, 'Maximum permissible error (MPE) limit is required'],
      min: [0, 'Permissible error must be a non-negative value'],
    },
    result: {
      type: String,
      enum: ['PASS', 'FAIL'],
      required: true,
      index: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    evidenceImages: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook: Automatically compute measurement error and PASS/FAIL compliance
inspectionSchema.pre('validate', function (next) {
  if (this.standardWeight !== undefined && this.observedReading !== undefined) {
    // Error = Observed Reading - Standard Reference Weight
    const calculatedError = Number((this.observedReading - this.standardWeight).toFixed(6));
    this.error = calculatedError;

    if (this.permissibleError !== undefined) {
      // Compliance check: |Error| <= Permissible Error => PASS, otherwise FAIL
      const isCompliant = Math.abs(calculatedError) <= Math.abs(this.permissibleError);
      this.result = isCompliant ? 'PASS' : 'FAIL';
    }
  }
  next();
});

const Inspection = mongoose.models.Inspection || mongoose.model('Inspection', inspectionSchema);

module.exports = Inspection;
