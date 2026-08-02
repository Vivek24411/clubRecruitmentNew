const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  type: { type: String, required: true, maxlength: 100 },
  title: { type: String, required: true, maxlength: 300 },
  message: { type: String, required: true, maxlength: 2000 },
  link: { type: String, default: null, maxlength: 500 },
  readAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
});

notificationSchema.index({ studentId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
