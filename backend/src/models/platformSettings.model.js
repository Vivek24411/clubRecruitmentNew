const mongoose = require("mongoose");

const platformSettingsSchema = new mongoose.Schema({
  key: { type: String, default: "global", unique: true, immutable: true },
  registrationEnabled: { type: Boolean, default: true },
  maintenanceMessage: { type: String, default: "", maxlength: 500 },
  recruitmentCycle: {
    name: { type: String, default: "", maxlength: 100 },
    status: { type: String, enum: ["draft", "open", "closed"], default: "open" },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
  },
  academicConfiguration: {
    rolloverMonth: { type: Number, min: 1, max: 12, default: 6 },
    rolloverDay: { type: Number, min: 1, max: 28, default: 1 },
    branches: {
      type: [{
        name: { type: String, required: true, trim: true, maxlength: 100 },
        durationYears: { type: Number, enum: [4, 5], default: 4 },
      }],
      default: [],
    },
  },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, default: null },
});

module.exports = mongoose.model("PlatformSettings", platformSettingsSchema);
