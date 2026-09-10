const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification must target a recipient user'],
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'APPLICATION_SUBMITTED',
        'DOCUMENT_REJECTED',
        'APPLICATION_APPROVED',
        'INSPECTION_SCHEDULED',
        'INSPECTION_COMPLETED',
        'APPLICATION_REJECTED',
        'CERTIFICATE_ISSUED',
        'CERTIFICATE_EXPIRING',
        'SYSTEM',
      ],
      default: 'SYSTEM',
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user unread notifications efficiently
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

module.exports = Notification;
