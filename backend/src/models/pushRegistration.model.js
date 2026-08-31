const mongoose = require("mongoose");

const pushRegistrationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
    index: true,
  },
  installationId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 200,
  },
  provider: {
    type: String,
    enum: ["fcm", "expo"],
    default: "fcm",
  },
  appOrigin: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300,
    index: true,
  },
  userAgent: {
    type: String,
    default: "",
    maxlength: 500,
  },
  lastSeenAt: {
    type: Date,
    default: Date.now,
  },
  lastDeliveredAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

pushRegistrationSchema.index({ studentId: 1, updatedAt: -1 });
pushRegistrationSchema.index({ appOrigin: 1, expiresAt: 1, studentId: 1 });
pushRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PushRegistration", pushRegistrationSchema);
