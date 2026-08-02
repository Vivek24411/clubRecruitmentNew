const mongoose = require('mongoose');

const eventMembershipSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'RegisterationEvent', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  role: { type: String, enum: ['captain', 'member'], required: true },
  joinedAt: { type: Date, default: Date.now },
});

eventMembershipSchema.index({ eventId: 1, studentId: 1 }, { unique: true });
eventMembershipSchema.index({ registrationId: 1 });

module.exports = mongoose.model('EventMembership', eventMembershipSchema);
