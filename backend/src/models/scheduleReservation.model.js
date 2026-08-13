const mongoose = require("mongoose");

const scheduleReservationSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  minute: { type: Date, required: true },
  slotId: { type: mongoose.Schema.Types.ObjectId, ref: "ScheduleSlot", required: true, index: true },
  token: { type: String, required: true, index: true },
}, { timestamps: true });

scheduleReservationSchema.index({ studentId: 1, minute: 1 }, { unique: true });

module.exports = mongoose.model("ScheduleReservation", scheduleReservationSchema);
