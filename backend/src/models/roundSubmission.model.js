const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  fieldKey: { type: String, default: "attachment", maxlength: 80 },
  // Kept only for legacy rows during migration. API responses never expose it.
  url: { type: String, default: "", maxlength: 2048, select: false },
  publicId: { type: String, required: true, maxlength: 500 },
  resourceType: { type: String, enum: ["image", "video", "raw"], required: true },
  deliveryType: { type: String, enum: ["upload", "authenticated"], default: "authenticated" },
  version: { type: Number, default: null },
  format: { type: String, default: "", maxlength: 30 },
  originalName: { type: String, default: "", maxlength: 255 },
  mimeType: { type: String, default: "", maxlength: 100 },
  bytes: { type: Number, default: 0, min: 0 },
}, { _id: false });

const answerSchema = new mongoose.Schema({
  key: { type: String, required: true, maxlength: 80 },
  value: { type: String, default: "", maxlength: 10000 },
}, { _id: false });

const roundSubmissionSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
  roundId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: "RegisterationEvent", required: true, index: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "RoundCandidate", required: true, unique: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  answers: { type: [answerSchema], default: [] },
  files: { type: [fileSchema], default: [] },
  revision: { type: Number, default: 1, min: 1 },
  status: { type: String, enum: ["submitted", "under_review", "accepted", "rejected"], default: "submitted" },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

roundSubmissionSchema.index({ eventId: 1, roundId: 1, submittedAt: -1 });

module.exports = mongoose.model("RoundSubmission", roundSubmissionSchema);
