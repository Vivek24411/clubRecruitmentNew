const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  type: { type: String, enum: ["notification"], required: true, index: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, enum: ["queued", "processing", "completed", "failed"], default: "queued", index: true },
  attempts: { type: Number, default: 0, min: 0 },
  maxAttempts: { type: Number, default: 8, min: 1, max: 20 },
  runAt: { type: Date, default: Date.now, index: true },
  lockedAt: { type: Date, default: null },
  lockedBy: { type: String, default: null },
  lastError: { type: String, default: "", maxlength: 1000 },
  completedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

jobSchema.index({ status: 1, runAt: 1, createdAt: 1 });
jobSchema.index({ completedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60, partialFilterExpression: { status: "completed" } });

module.exports = mongoose.model("Job", jobSchema);
