const mongoose = require("mongoose");

const applicationHistorySchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: "RegisterationEvent", required: true },
  captainId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  role: { type: String, enum: ["captain", "member"], required: true },
  reason: { type: String, enum: ["withdrawn", "left", "removed"], required: true },
  teamName: { type: String, default: null, maxlength: 80 },
  roundDetails: { type: Array, default: [] },
  currentRound: { type: Number, default: 0 },
  numberOfRounds: { type: Number, default: 0 },
  registeredAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now, index: true },
});

applicationHistorySchema.index({ studentId: 1, createdAt: -1 });

module.exports = mongoose.model("ApplicationHistory", applicationHistorySchema);
