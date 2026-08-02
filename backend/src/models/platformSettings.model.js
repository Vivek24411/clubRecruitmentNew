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
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, default: null },
});

module.exports = mongoose.model("PlatformSettings", platformSettingsSchema);
