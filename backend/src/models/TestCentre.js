const mongoose = require('mongoose');

const testCentreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide test centre name'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Please provide test centre address'],
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
      required: [true, 'Please provide state'],
      trim: true,
      index: true,
    },
    contact: {
      type: String,
      required: [true, 'Please provide contact number'],
      trim: true,
    },
    officer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const TestCentre = mongoose.models.TestCentre || mongoose.model('TestCentre', testCentreSchema);

module.exports = TestCentre;
