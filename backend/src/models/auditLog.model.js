const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actorRole: { type: String, enum: ['student', 'club', 'admin', 'system'], required: true },
  actorId: { type: String, default: null },
  action: { type: String, required: true, index: true },
  targetType: { type: String, required: true },
  targetId: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
