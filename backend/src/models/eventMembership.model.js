const mongoose = require('mongoose');

const eventMembershipSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  // The vertical this membership belongs to. Teams are independent per
  // vertical, so uniqueness is scoped to the vertical rather than the event.
  verticalId: { type: mongoose.Schema.Types.ObjectId, required: true },
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'RegisterationEvent', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  role: { type: String, enum: ['captain', 'member'], required: true },
  joinedAt: { type: Date, default: Date.now },
});

eventMembershipSchema.index({ eventId: 1, verticalId: 1, studentId: 1 }, { unique: true });
// Named explicitly: the auto-generated name would collide with the legacy
// unique (eventId, studentId) index that older databases still carry, which
// makes autoIndex fail to build this one until the migration drops that.
eventMembershipSchema.index({ eventId: 1, studentId: 1 }, { name: "event_student_lookup" });
// getMyApplications lists a student's memberships newest-first, and a student
// now holds one per vertical rather than one per event.
eventMembershipSchema.index({ studentId: 1, joinedAt: -1 });
eventMembershipSchema.index({ registrationId: 1 });

module.exports = mongoose.model('EventMembership', eventMembershipSchema);
