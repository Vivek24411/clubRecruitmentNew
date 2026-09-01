const mongoose = require("mongoose");
const { isHttpUrl } = require("../utils/validation");

const sessionSchema = new mongoose.Schema({
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Club",
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150,
  },
  shortDescription: {
    type: String,
    maxlength: 500,
  },
  longDescription: {
    type: String,
    maxlength: 10000,
  },
  date: {
    type: String,
    maxlength: 10,
  },
  time: {
    type: String,
    maxlength: 5,
  },
  venue: {
    type: String,
    maxlength: 300,
  },
  meetingUrl: {
    type: String,
    trim: true,
    maxlength: 2048,
    validate: { validator: isHttpUrl, message: "Meeting link must use http or https" },
  },
  sessionThumbnail: {
    type: String,
    default: "",
  },
  sessionThumbnailPublicId: {
    type: String,
    default: "",
  },
  duration: {
    type: String,
    maxlength: 4,
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed', 'archived'],
    default: 'published',
    index: true,
  },
  pushAnnouncementSentAt: {
    type: Date,
    default: null,
  },
  capacity: {
    type: Number,
    default: null,
    min: 1,
  },
  confirmedRsvpCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

sessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

sessionSchema.index({ status: 1, date: 1, time: 1 });
sessionSchema.index({ clubId: 1, status: 1, createdAt: -1 });
sessionSchema.index({ title: "text", shortDescription: "text", longDescription: "text", venue: "text" });

const sessionModel = mongoose.model("Session", sessionSchema);

module.exports = sessionModel;
