const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const otpModel = require("../models/otp.model");
const { sendOtp } = require("../services/student.services");
const studentModel = require("../models/student.model");

module.exports.sendOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({ errors: errors.array(), success: false });
  }

  const { email } = req.body;

  

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(otp);


  const existingOTP = await otpModel.findOne({ email });

  

  const hashedOtp = await bcrypt.hash(otp, 10);


  if (existingOTP) {
    await otpModel.updateOne({ email }, { otp: hashedOtp });
  } else {
    await otpModel.create({ email, otp: hashedOtp });
  }

  await sendOtp(email, otp);

  return res.json({
    success: true,
    msg: "OTP sent successfully",
  });
};

module.exports.verifyOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({ errors: errors.array(), success: false });
  }

  const { email, otp } = req.body;

  const otpRecord = await otpModel.findOne({ email });
  if (!otpRecord) {
    return res.json({ success: false, msg: "OTP not found" });
  }

  console.log(otpRecord);
  

  const isMatch = await bcrypt.compare(otp, otpRecord.otp);
  console.log(isMatch);
  
  
  if (!isMatch) {
    return res.json({ success: false, msg: "Invalid OTP" });
  }

  await otpModel.deleteOne({ email });
  return res.json({ success: true, msg: "OTP verified successfully" });
};

module.exports.register = async (req, res) => {
  try{
    const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({ errors: errors.array(), success: false });
  }

  const { name, email, password, branch, year } = req.body;

  const existingStudent = await studentModel.findOne({ email });
  if (existingStudent) {
    return res.json({ success: false, msg: "Student already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const student = await studentModel.create({
    name,
    email,
    password: hashedPassword,
    branch,
    year,
  });

  const token = await student.createToken();

  return res.json({
    success: true,
    msg: "Registration successful",
    token,
    student,
  });
  }catch(err){
    console.error(err);
    return res.json({ success: false, msg: err.message||"Server error" });
  }
};

module.exports.login = async (req, res) => {
    const error = validationResult(req)

    if(!error.isEmpty()){
        return res.json({ errors: error.array(), success: false });
    }

    const { email, password } = req.body;

    const student = await studentModel.findOne({ email });
    if (!student) {
        return res.json({ success: false, msg: "Invalid email or password" });
    }

    const isMatch = await student.comparePassword(password);
    if (!isMatch) {
        return res.json({ success: false, msg: "Invalid email or password" });
    }

    const token = await student.createToken();
    return res.json({
        success: true,
        msg: "Login successful",
        token,
        student,
    });
};
