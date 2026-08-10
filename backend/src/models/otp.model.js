const mongoose = require ('mongoose')

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['signup', 'password_reset', 'club_password_reset'],
    required: true,
    default: 'signup',
  },
  attempts: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '5m',
  },
});

otpSchema.index({ email: 1, purpose: 1 }, { unique: true });

const otpModel = mongoose.model('Otp', otpSchema);

module.exports = otpModel;
