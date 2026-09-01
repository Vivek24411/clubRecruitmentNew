const mongoose = require("mongoose");

const calendarBookmarkSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  sourceType: { type: String, enum: ["event", "session"], required: true },
  sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  createdAt: { type: Date, default: Date.now },
});

calendarBookmarkSchema.index({ studentId: 1, sourceType: 1, sourceId: 1 }, { unique: true });

module.exports = mongoose.model("CalendarBookmark", calendarBookmarkSchema);
