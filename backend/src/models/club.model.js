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
  clubLogo: {
    type: String,
  },
  clubLogoPublicId: {
    type: String,
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

clubSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

clubSchema.methods.createToken = async function() {
  const { signSession } = require('../utils/auth');
  return signSession({ subject: this._id, role: 'club', version: this.tokenVersion || 0 });
}

const clubModel = mongoose.model("Club", clubSchema);

module.exports = clubModel;
