const mongoose = require("mongoose");

const roundCandidateSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
  // Denormalised from the registration. roundId is already globally unique so
  // round-scoped queries never needed this, but event-wide club queries do.
  verticalId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  roundId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: "RegisterationEvent", required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
  participantIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }], default: [] },
  scope: { type: String, enum: ["application", "participant"], required: true },
  status: {
    type: String,
    enum: ["eligible", "scheduled", "active", "submitted", "under_review", "waitlisted", "advanced", "rejected", "missed", "withdrawn", "revoked"],
    default: "eligible",
    index: true,
  },
  score: { type: Number, default: null, min: 0 },
  notes: { type: String, default: null, maxlength: 4000 },
  decisionPublishedAt: { type: Date, default: null },
  sourceCandidateId: { type: mongoose.Schema.Types.ObjectId, ref: "RoundCandidate", default: null },
  sourceCandidateIds: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "RoundCandidate" }],
    default: [],
  },
}, { timestamps: true });

roundCandidateSchema.index(
  { eventId: 1, roundId: 1, registrationId: 1, studentId: 1 },
  { unique: true }
);
roundCandidateSchema.index({ participantIds: 1, status: 1 });
roundCandidateSchema.index({ sourceCandidateIds: 1 });
roundCandidateSchema.index({ eventId: 1, roundId: 1, status: 1, createdAt: 1 });
roundCandidateSchema.index({ eventId: 1, verticalId: 1, status: 1 });

module.exports = mongoose.model("RoundCandidate", roundCandidateSchema);
