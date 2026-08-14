const mongoose = require('mongoose')
const bcrypt = require('bcrypt');


const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  branch:{
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  year: {
    type: String,
    required: true,
    maxlength: 20,
  },
  academicYear: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    default: null,
  },
  academicStatus: {
    type: String,
    enum: ["studying", "passed_out"],
    default: "studying",
  },
  programStartYear: {
    type: Number,
    min: 1990,
    max: 2200,
    default: null,
  },
  courseDurationYears: {
    type: Number,
    enum: [4, 5],
    default: 4,
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    maxlength: 30,
  },
  profilePicture: {
    type: String,
    default: "",
  },
  profilePicturePublicId: {
    type: String,
    default: "",
  },
  enrollmentNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  tokenVersion: {
    type: Number,
    default: 0,
    select: false,
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active',
    index: true,
  },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true },
  },
});

studentSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

studentSchema.methods.createToken = async function() {
  const { signSession } = require('../utils/auth');
  return signSession({ subject: this._id, role: 'student', version: this.tokenVersion || 0 });
};

const studentModel = mongoose.model("Student", studentSchema);

module.exports = studentModel;
