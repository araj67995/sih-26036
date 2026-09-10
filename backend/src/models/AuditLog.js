const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Nullable for system or anonymous public verifications
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action name is required for audit trail'],
      trim: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: ['Application', 'Certificate', 'Inspection', 'Document', 'Instrument', 'Business', 'User', 'System'],
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.Mixed, // Can store ObjectId or string number (e.g. certificateNumber)
      required: true,
      index: true,
    },
    previousStatus: {
      type: String,
      default: null,
    },
    newStatus: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // Uses explicit immutable timestamp field
  }
);

// Compound index for timeline lookups on specific entities
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
