const mongoose = require('mongoose');

const sessionRsvpSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  status: { type: String, enum: ['confirmed', 'waitlisted', 'cancelled', 'attended', 'absent'], default: 'confirmed' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

sessionRsvpSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('SessionRsvp', sessionRsvpSchema);
