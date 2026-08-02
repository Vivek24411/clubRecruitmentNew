const mongoose = require("mongoose");

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
});

sessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const sessionModel = mongoose.model("Session", sessionSchema);

module.exports = sessionModel;
