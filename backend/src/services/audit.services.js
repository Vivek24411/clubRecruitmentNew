const auditLogModel = require('../models/auditLog.model');

async function writeAudit({ actorRole, actorId, action, targetType, targetId, metadata = {} }) {
  try {
    await auditLogModel.create({
      actorRole,
      actorId: actorId ? String(actorId) : null,
      action,
      targetType,
      targetId: targetId ? String(targetId) : null,
      metadata,
    });
  } catch (error) {
    console.error('Audit log write failed', { action, targetType, message: error.message });
  }
}

module.exports = { writeAudit };
