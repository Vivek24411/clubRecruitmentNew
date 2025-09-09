const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const clubSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  userName: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  shortDescription: {
    type: String,
  },
  longDescription: {
    type: String,
  },
  website: {
    type: String,
  },
  linkedin: {
    type: String,
  },
  instagram: {
    type: String,
  },
  achivements: {
    type: String,
  },
  recruitmentMethods: {
    type: String,
  },
  contactEmail: {
    type: String,
  },
  contactPhone: {
    type: String,
  },
  achivements: {
    type: String,
  },
});

clubSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

clubSchema.methods.createToken = async function() {
  const token = jwt.sign({ id: this._id }, process.env.JWT_SECRET);
  return token;
}

const clubModel = mongoose.model("Club", clubSchema);

module.exports = clubModel;
