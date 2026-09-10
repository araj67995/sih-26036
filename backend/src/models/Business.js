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
  },
  {
    timestamps: true,
  }
);

const Business = mongoose.models.Business || mongoose.model('Business', businessSchema);

module.exports = Business;
