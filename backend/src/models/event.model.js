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
    trim: true,
    maxlength: 150,
  },
  shortDescription: {
    type: String,
    required: true,
    maxlength: 500,
  },
  longDescription: {
    type: String,
    required: true,
    maxlength: 10000,
  },
  registerationDeadline: {
    type: String,
    maxlength: 10,
  },
  registrationDeadlineAt: {
    type: Date,
  },
  registrationType: {
    type: String,
    enum: ['individual', 'team', 'optional_team'],
    default: 'team',
  },
  minTeamSize: {
    type: Number,
    default: 1,
    min: 1,
  },
  maxTeamSize: {
    type: Number,
    default: 1,
    min: 1,
    max: 10000,
  },
  maxParticipants: {
    type: Number,
    min: 1,
    max: 10000,
  },
  ContactInfo: {
    type: Array
  },
  roundDetails: {
    type: Array
  },
  eligibility: {
    type: String,
    maxlength: 2000,
  },
  numberOfRounds: {
    type: Number,
    min: 0,
    max: 20,
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'closed', 'archived', 'cancelled'],
    default: 'published',
    index: true,
  },
  publishedAt: {
    type: Date,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  eventBanner: {
    type: String,
  },
  eventBannerPublicId: {
    type: String,
  },
 
 
});

eventSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (!this.registrationDeadlineAt && this.registerationDeadline) {
    this.registrationDeadlineAt = new Date(`${this.registerationDeadline}T23:59:59.999+05:30`);
  }
  if (!this.maxTeamSize && this.maxParticipants) this.maxTeamSize = this.maxParticipants;
  if (this.status === 'published' && !this.publishedAt) this.publishedAt = new Date();
  next();
});

eventSchema.pre('validate', function(next) {
  if (this.registrationType === 'individual') {
    this.minTeamSize = 1;
    this.maxTeamSize = 1;
  }
  if (this.maxTeamSize < this.minTeamSize) {
    return next(new Error('Maximum team size cannot be smaller than minimum team size'));
  }
  next();
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
