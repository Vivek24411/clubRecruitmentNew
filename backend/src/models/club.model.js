const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const clubSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 150,
  },
  userName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 80,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  accountEmail: {
    type: String,
    lowercase: true,
    trim: true,
    maxlength: 254,
    index: { unique: true, sparse: true },
  },
  category: {
    type: String,
    default: "technical",
    trim: true,
    lowercase: true,
    maxlength: 50,
    index: true,
  },
  shortDescription: {
    type: String,
    maxlength: 500,
  },
  longDescription: {
    type: String,
    maxlength: 10000,
  },
  website: {
    type: String,
    maxlength: 2048,
  },
  linkedin: {
    type: String,
    maxlength: 2048,
  },
  instagram: {
    type: String,
    maxlength: 2048,
  },
  achivements: {
    type: String,
    maxlength: 10000,
  },
  recruitmentMethods: {
    type: String,
    maxlength: 10000,
  },
  contactEmail: {
    type: String,
    maxlength: 254,
  },
  contactPhone: {
    type: String,
    maxlength: 30,
  },
  contactPersons: {
    type: [{
      name: { type: String, default: "", trim: true, maxlength: 100 },
      role: { type: String, default: "", trim: true, maxlength: 100 },
      phone: { type: String, required: true, trim: true, maxlength: 30 },
    }],
    default: [],
  },
  clubLogo: {
    type: String,
  },
  clubLogoPublicId: {
    type: String,
  },
  clubBanner: {
    type: String,
    default: "",
  },
  clubBannerPublicId: {
    type: String,
    default: "",
  },
  resources: {
    type: [{
      title: { type: String, required: true, trim: true, maxlength: 150 },
      description: { type: String, default: "", maxlength: 1000 },
      url: { type: String, required: true, trim: true, maxlength: 2048 },
      type: { type: String, enum: ["link", "document", "video", "repository", "other"], default: "link" },
    }],
    default: [],
  },
  annualEvents: {
    type: [{
      name: { type: String, required: true, trim: true, maxlength: 150 },
      description: { type: String, default: "", maxlength: 3000 },
      eligibility: { type: String, default: "", maxlength: 1000 },
      perks: { type: String, default: "", maxlength: 1000 },
      tentativeDate: { type: String, default: "", maxlength: 100 },
      url: { type: String, default: "", trim: true, maxlength: 2048 },
    }],
    default: [],
  },
  status: {
    type: String,
    enum: ["active", "suspended"],
    default: "active",
  },
  tokenVersion: {
    type: Number,
    default: 0,
    select: false,
  },
});

clubSchema.pre("validate", function(next) {
  if (!this.accountEmail && this.contactEmail) this.accountEmail = this.contactEmail;
  next();
});

clubSchema.index({ status: 1, category: 1, name: 1 });

clubSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

clubSchema.methods.createToken = async function() {
  const { signSession } = require('../utils/auth');
  return signSession({ subject: this._id, role: 'club', version: this.tokenVersion || 0 });
}

const clubModel = mongoose.model("Club", clubSchema);

module.exports = clubModel;
