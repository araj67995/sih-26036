const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification must target a recipient user'],
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
        'PAYMENT',
        'PAYMENT_COMPLETED',
        'OFFICER_ALLOCATED',
        'WAITING_FOR_ALLOCATION',
        'MANUAL_REASSIGNMENT',
        'LOCATION_REQUIRED',
        'SYSTEM',
      ],
      default: 'SYSTEM',
      index: true,
    },
    relatedEntity: {
      entityType: {
        type: String,
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
      },
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

// Synchronize user and recipient so both are populated regardless of which one was provided
notificationSchema.pre('validate', function (next) {
  if (!this.user && this.recipient) {
    this.user = this.recipient;
  }
  if (!this.recipient && this.user) {
    this.recipient = this.user;
  }
  next();
});

// Compound index for querying user unread notifications efficiently
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

module.exports = Notification;
