const mongoose = require("mongoose");
const { normalizeProgrammeEligibility } = require("../services/academic.services");

const programmeEligibilitySchema = new mongoose.Schema({
  programme: {
    type: String,
    enum: ["undergraduate", "mtech", "msc", "mba", "phd"],
    required: true,
  },
  years: {
    type: [{ type: Number, enum: [1, 2, 3, 4, 5] }],
    default: [],
  },
}, { _id: false });

const submissionFieldSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, maxlength: 80 },
  label: { type: String, required: true, trim: true, maxlength: 120 },
  type: {
    type: String,
    enum: ["text", "short_text", "long_text", "boolean", "url", "drive_link", "github", "file", "pdf", "video"],
    default: "url",
  },
  required: { type: Boolean, default: true },
  helpText: { type: String, default: "", maxlength: 300 },
}, { _id: false });

const roundSchema = new mongoose.Schema({
  order: { type: Number, required: true, min: 1, max: 20 },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  type: {
    type: String,
    enum: ["test", "submission", "interview", "group_discussion", "presentation", "hackathon", "custom"],
    required: true,
  },
  customType: { type: String, default: "", trim: true, maxlength: 100 },
  description: { type: String, default: "", maxlength: 2000 },
  instructions: { type: String, default: "", maxlength: 5000 },
  evaluationScope: { type: String, enum: ["application", "participant"], default: "application" },
  interviewMode: { type: String, enum: ["group", "individual", null], default: null },
  scheduleMode: { type: String, enum: ["none", "common", "slots"], default: "none" },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  venue: { type: String, default: "", trim: true, maxlength: 300 },
  meetingUrl: { type: String, default: "", trim: true, maxlength: 2048 },
  slotDurationMinutes: { type: Number, default: 20, min: 5, max: 480 },
  slotBufferMinutes: { type: Number, default: 0, min: 0, max: 120 },
  slotCapacity: { type: Number, default: 1, min: 1, max: 100 },
  submissionEnabled: { type: Boolean, default: false },
  submissionOpensAt: { type: Date, default: null },
  submissionDeadlineAt: { type: Date, default: null },
  allowResubmission: { type: Boolean, default: true },
  submissionFields: { type: [submissionFieldSchema], default: [] },
}, { timestamps: true });

roundSchema.pre("validate", function(next) {
  if (this.type === "submission") {
    this.submissionEnabled = true;
    this.scheduleMode = "common";
    this.submissionOpensAt = this.startsAt || null;
    this.submissionDeadlineAt = this.endsAt || null;
  } else if (this.type === "hackathon") {
    this.submissionEnabled = true;
  }
  if (this.type === "test") this.evaluationScope = "participant";
  if (this.type === "interview") {
    this.interviewMode = this.interviewMode || "individual";
    this.evaluationScope = this.interviewMode === "group" ? "application" : "participant";
    this.scheduleMode = "slots";
  }
  if (["test", "group_discussion", "presentation"].includes(this.type) && this.startsAt) {
    this.scheduleMode = this.scheduleMode === "none" ? "common" : this.scheduleMode;
  }
  next();
});

// A vertical (or track) is an independent sub-event: its own rounds, its own
// teams, its own decisions. Every event has at least one. Events that do not
// use verticals carry a single `isDefault` vertical that no UI ever shows, so
// the workflow engine never has to ask whether verticals are in play.
const verticalSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  shortDescription: { type: String, default: "", maxlength: 500 },
  description: { type: String, default: "", maxlength: 5000 },
  problemStatementUrl: { type: String, default: "", trim: true, maxlength: 2048 },
  order: { type: Number, required: true, min: 1, max: 20 },
  isDefault: { type: Boolean, default: false },
  status: { type: String, enum: ["open", "closed"], default: "open" },

  registrationType: {
    type: String,
    enum: ["individual", "team", "optional_team"],
    default: "team",
  },
  minTeamSize: { type: Number, default: 1, min: 1 },
  maxTeamSize: { type: Number, default: 1, min: 1, max: 10000 },
  maxParticipants: { type: Number, default: null, min: 1, max: 10000 },

  // null / empty means "inherit whatever the event says".
  registrationDeadlineAt: { type: Date, default: null },
  eligibilityMode: { type: String, enum: ["undergraduate", "all_iitr", null], default: null },
  programmeEligibility: { type: [programmeEligibilitySchema], default: [] },

  rounds: { type: [roundSchema], default: [] },
  numberOfRounds: { type: Number, default: 0, min: 0, max: 20 },
}, { timestamps: true });

const eventSchema = new mongoose.Schema({
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  eventType: {
    type: String,
    enum: ["recruitment", "hackathon", "competition", "workshop", "other"],
    default: "recruitment",
  },
  shortDescription: { type: String, required: true, maxlength: 500 },
  longDescription: { type: String, default: "", maxlength: 10000 },
  problemStatementUrl: { type: String, default: "", trim: true, maxlength: 2048 },
  registerationDeadline: { type: String, maxlength: 10 },
  registrationDeadlineAt: { type: Date, default: null },
  // Event-level team settings seed each new vertical. The workflow engine reads
  // the vertical's own copy, never these.
  registrationType: {
    type: String,
    enum: ["individual", "team", "optional_team"],
    default: "team",
  },
  minTeamSize: { type: Number, default: 1, min: 1 },
  maxTeamSize: { type: Number, default: 1, min: 1, max: 10000 },
  maxParticipants: { type: Number, default: null, min: 1, max: 10000 },
  ContactInfo: { type: [String], default: [] },
  // Retained during the migration window so old records and old clients remain readable.
  roundDetails: { type: Array, default: [] },
  // Superseded by verticals[].rounds. Kept as a frozen legacy snapshot so the
  // one-time backfill stays re-runnable; no new code writes it.
  rounds: { type: [roundSchema], default: [] },
  verticals: { type: [verticalSchema], default: [] },
  // Whether the club presents verticals to students at all.
  verticalsEnabled: { type: Boolean, default: false },
  // How many verticals of this event one student may apply to. null = unlimited.
  maxVerticalApplications: { type: Number, default: 1, min: 1, max: 20 },
  eligibility: { type: String, default: "", maxlength: 2000 },
  eligibilityMode: {
    type: String,
    enum: ["undergraduate", "all_iitr"],
    default: "undergraduate",
  },
  programmeEligibility: {
    type: [programmeEligibilitySchema],
    default: () => [{ programme: "undergraduate", years: [] }],
  },
  // Legacy fields remain readable during migration. Branches no longer affect eligibility.
  eligibilityYears: {
    type: [{ type: Number, enum: [1, 2, 3, 4, 5] }],
    default: [],
  },
  eligibilityBranches: { type: [String], default: [] },
  allowPassedOut: { type: Boolean, default: false },
  numberOfRounds: { type: Number, min: 0, max: 20 },
  deadlineNotificationsEnabled: { type: Boolean, default: true },
  status: {
    type: String,
    enum: ["draft", "published", "closed", "archived", "cancelled"],
    default: "published",
    index: true,
  },
  publishedAt: { type: Date, default: null },
  pushAnnouncementSentAt: { type: Date, default: null },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  eventBanner: { type: String, default: "" },
  eventBannerPublicId: { type: String, default: "" },
});

eventSchema.pre("validate", function(next) {
  this.programmeEligibility = normalizeProgrammeEligibility(
    this.programmeEligibility,
    this.eligibilityMode,
    this.eligibilityYears,
  );
  const undergraduateRule = this.programmeEligibility.find((rule) => rule.programme === "undergraduate");
  this.eligibilityYears = this.eligibilityMode === "undergraduate" ? undergraduateRule?.years || [] : [];
  this.eligibilityBranches = [];
  this.allowPassedOut = false;
  if (this.registrationType === "individual") {
    this.minTeamSize = 1;
    this.maxTeamSize = 1;
  }
  if (this.maxTeamSize < this.minTeamSize) {
    return next(new Error("Maximum team size cannot be smaller than minimum team size"));
  }

  // Every event carries at least one vertical. Events that predate verticals,
  // or that never enabled them, get a hidden default seeded from the event.
  if (!this.verticals?.length) {
    this.verticals = [{
      title: this.title || "General",
      order: 1,
      isDefault: true,
      registrationType: this.registrationType,
      minTeamSize: this.minTeamSize,
      maxTeamSize: this.maxTeamSize,
      maxParticipants: this.maxParticipants,
      problemStatementUrl: this.problemStatementUrl,
      rounds: (this.rounds || []).map((round) => (round.toObject ? round.toObject() : round)),
    }];
  }

  for (const [index, vertical] of this.verticals.entries()) {
    vertical.order = index + 1;
    if (this.verticalsEnabled) vertical.isDefault = false;
    if (vertical.registrationType === "individual") {
      vertical.minTeamSize = 1;
      vertical.maxTeamSize = 1;
    }
    if (vertical.maxTeamSize < vertical.minTeamSize) {
      return next(new Error(`Maximum team size cannot be smaller than minimum team size in ${vertical.title}`));
    }
    if (vertical.eligibilityMode) {
      vertical.programmeEligibility = normalizeProgrammeEligibility(
        vertical.programmeEligibility,
        vertical.eligibilityMode,
        [],
      );
    } else {
      vertical.programmeEligibility = [];
    }
    (vertical.rounds || []).forEach((round, roundIndex) => {
      round.order = roundIndex + 1;
      if (vertical.registrationType === "individual" || round.type === "test") {
        round.evaluationScope = "participant";
      }
    });
    vertical.numberOfRounds = vertical.rounds?.length || 0;
  }

  if (this.verticalsEnabled && this.verticals.length < 2) {
    return next(new Error("An event with verticals needs at least two verticals"));
  }
  if (this.maxVerticalApplications != null && this.maxVerticalApplications > this.verticals.length) {
    this.maxVerticalApplications = this.verticals.length;
  }
  this.numberOfRounds = this.verticals[0]?.numberOfRounds || 0;
  next();
});

eventSchema.pre("save", function(next) {
  this.updatedAt = new Date();
  if (!this.registrationDeadlineAt && this.registerationDeadline) {
    this.registrationDeadlineAt = new Date(`${this.registerationDeadline}T23:59:59.999+05:30`);
  }
  if (!this.maxTeamSize) this.maxTeamSize = 1;
  if (this.status === "published" && !this.publishedAt) this.publishedAt = new Date();
  next();
});

eventSchema.index({ clubId: 1, status: 1, createdAt: -1 });
eventSchema.index({ status: 1, registrationDeadlineAt: 1, publishedAt: -1 });

module.exports = mongoose.model("Event", eventSchema);
module.exports.roundSchema = roundSchema;
module.exports.verticalSchema = verticalSchema;
