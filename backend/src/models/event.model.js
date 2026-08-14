const mongoose = require("mongoose");

const submissionFieldSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, maxlength: 80 },
  label: { type: String, required: true, trim: true, maxlength: 120 },
  type: {
    type: String,
    enum: ["text", "url", "github", "file", "pdf", "video"],
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
  if (this.type === "submission" || this.type === "hackathon") this.submissionEnabled = true;
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

const eventSchema = new mongoose.Schema({
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  eventType: {
    type: String,
    enum: ["recruitment", "hackathon", "competition", "workshop", "other"],
    default: "recruitment",
  },
  shortDescription: { type: String, required: true, maxlength: 500 },
  longDescription: { type: String, required: true, maxlength: 10000 },
  registerationDeadline: { type: String, maxlength: 10 },
  registrationDeadlineAt: { type: Date, default: null },
  registrationType: {
    type: String,
    enum: ["individual", "team", "optional_team"],
    default: "team",
  },
  minTeamSize: { type: Number, default: 1, min: 1 },
  maxTeamSize: { type: Number, default: 1, min: 1, max: 10000 },
  maxParticipants: { type: Number, min: 1, max: 10000 },
  ContactInfo: { type: [String], default: [] },
  // Retained during the migration window so old records and old clients remain readable.
  roundDetails: { type: Array, default: [] },
  rounds: { type: [roundSchema], default: [] },
  eligibility: { type: String, default: "", maxlength: 2000 },
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
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  eventBanner: { type: String, default: "" },
  eventBannerPublicId: { type: String, default: "" },
});

eventSchema.pre("validate", function(next) {
  if (this.registrationType === "individual") {
    this.minTeamSize = 1;
    this.maxTeamSize = 1;
  }
  if (this.maxTeamSize < this.minTeamSize) {
    return next(new Error("Maximum team size cannot be smaller than minimum team size"));
  }
  if (this.rounds?.length) {
    this.rounds.forEach((round, index) => {
      round.order = index + 1;
      if (this.registrationType === "individual" || round.type === "test") {
        round.evaluationScope = "participant";
      }
    });
    this.numberOfRounds = this.rounds.length;
  }
  next();
});

eventSchema.pre("save", function(next) {
  this.updatedAt = new Date();
  if (!this.registrationDeadlineAt && this.registerationDeadline) {
    this.registrationDeadlineAt = new Date(`${this.registerationDeadline}T23:59:59.999+05:30`);
  }
  if (!this.maxTeamSize && this.maxParticipants) this.maxTeamSize = this.maxParticipants;
  if (this.status === "published" && !this.publishedAt) this.publishedAt = new Date();
  next();
});

eventSchema.index({ clubId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Event", eventSchema);
module.exports.roundSchema = roundSchema;
