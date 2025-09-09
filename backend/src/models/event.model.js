const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: true
    },
  title: {
    type: String,
    required: true,
  },
  shortDescription: {
    type: String,
    required: true,
  },
  longDescription: {
    type: String,
    required: true,
  },
  registerationDeadline: {
    type: String
  },
  maxParticipants: {
    type: Number,
  },
  ContactInfo: {
    type: Array
  },
  roundDetails: {
    type: Array
  },
  eligibility: {
    type: String
  },
  numberOfRounds: {
    type: Number
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
 
 
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;