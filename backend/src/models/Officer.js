const mongoose = require('mongoose');

const officerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Officer must be linked to a user account'],
      unique: true,
      index: true,
    },
    officerName: {
      type: String,
      required: [true, 'Officer name is required'],
      trim: true,
    },
    officeName: {
      type: String,
      required: [true, 'Office name is required (e.g. Legal Metrology Office, Patna)'],
      trim: true,
    },
    officeAddress: {
      type: String,
      required: [true, 'Office address is required'],
      trim: true,
    },
    district: {
      type: String,
      required: [true, 'District is required'],
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      index: true,
    },
    pincode: {
      type: String,
      trim: true,
      match: [/^[1-9][0-9]{5}$/, 'Please provide a valid 6-digit Indian PIN code'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Geospatial coordinates [longitude, latitude] are required'],
        validate: {
          validator: function (val) {
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
    serviceRadius: {
      type: Number,
      default: 50, // in kilometers
      min: [1, 'Service radius must be at least 1 km'],
      max: [500, 'Service radius cannot exceed 500 km'],
    },
    availabilityStatus: {
      type: String,
      enum: ['AVAILABLE', 'UNAVAILABLE', 'ON_LEAVE', 'BUSY'],
      default: 'AVAILABLE',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// MongoDB 2dsphere index for geospatial distance querying
officerSchema.index({ location: '2dsphere' });
officerSchema.index({ district: 1, state: 1, availabilityStatus: 1, status: 1 });

const Officer = mongoose.models.Officer || mongoose.model('Officer', officerSchema);

module.exports = Officer;
