const { AuditLog } = require('../models');

/**
 * Log an important lifecycle action to the immutable AuditLog collection
 */
const logAction = async ({
  user = null,
  action,
  entityType,
  entityId,
  previousStatus = null,
  newStatus = null,
  description,
  ipAddress = null,
}) => {
  try {
    await AuditLog.create({
      user: user ? user._id || user : null,
      action,
      entityType,
      entityId,
      previousStatus,
      newStatus,
      description,
      ipAddress,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[Audit Log Service Error]:', error.message);
  }
};

module.exports = { logAction };
