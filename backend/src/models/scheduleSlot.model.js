const mongoose = require("mongoose");

const scheduleSlotSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
  roundId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "RoundCandidate", required: true, unique: true },
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: "RegisterationEvent", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
  participantIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }], default: [], index: true },
  startAt: { type: Date, required: true, index: true },
  endAt: { type: Date, required: true, index: true },
  venue: { type: String, default: "", maxlength: 300 },
  meetingUrl: { type: String, default: "", maxlength: 2048 },
  status: { type: String, enum: ["scheduled", "completed", "cancelled"], default: "scheduled", index: true },
  batchId: { type: String, default: null, maxlength: 100 },
}, { timestamps: true });

scheduleSlotSchema.index({ participantIds: 1, startAt: 1, endAt: 1, status: 1 });

module.exports = mongoose.model("ScheduleSlot", scheduleSlotSchema);
