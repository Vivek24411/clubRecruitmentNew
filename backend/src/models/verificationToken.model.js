const mongoose = require("mongoose");

const verificationTokenSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  purpose: { type: String, enum: ["signup", "password_reset", "club_password_reset"], required: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  createdAt: { type: Date, default: Date.now },
});

verificationTokenSchema.index({ email: 1, purpose: 1 });

module.exports = mongoose.model("VerificationToken", verificationTokenSchema);
