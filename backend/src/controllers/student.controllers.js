const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const otpModel = require("../models/otp.model");
const { sendOtp, checkEmailDomain } = require("../services/student.services");
const studentModel = require("../models/student.model");
const sessionModel = require("../models/session.model");
const clubModel = require("../models/club.model");
const eventModel = require("../models/event.model");
const registerationEventModel = require("../models/registerationEvent.model");

module.exports.sendOtp = async (req, res) => {
 try{
   const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({ errors: errors.array(), success: false });
  }

  const { email } = req.body;

  const validEmailFormat = checkEmailDomain(email);
  if (!validEmailFormat) {
    return res.json({
      success: false,
      msg: "Please use your college email to register",
    });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();


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
 }catch(err){
    console.error('Error in sendOtp controller:', err);
    return res.json({ success: false, msg: err.message || "Server error" });
  }
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



  const isMatch = await bcrypt.compare(otp, otpRecord.otp);
  console.log(isMatch);

  if (!isMatch) {
    return res.json({ success: false, msg: "Invalid OTP" });
  }

  await otpModel.deleteOne({ email });
  return res.json({ success: true, msg: "OTP verified successfully" });
};

module.exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({ errors: errors.array(), success: false });
    }

    const { name, email, password, branch, year, phoneNumber, enrollmentNumber } = req.body;
    console.log(enrollmentNumber);
    

    const existingStudent = await studentModel.findOne({ email });
    if (existingStudent) {
      return res.json({ success: false, msg: "Student already exists" });
    }

    const existingPhoneNumber = await studentModel.findOne({ phoneNumber });
    if (existingPhoneNumber) {
      return res.json({ success: false, msg: "Phone number already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const student = await studentModel.create({
      name,
      email,
      password: hashedPassword,
      branch,
      year,
      phoneNumber,
      enrollmentNumber
    });

    const token = await student.createToken();

    return res.json({
      success: true,
      msg: "Registration successful",
      token,
      student,
    });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, msg: err.message || "Server error" });
  }
};

module.exports.login = async (req, res) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
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

module.exports.getProfile = async (req, res) => {
  try {
    const student = req.student;
    if (!student) {
      return res.status(404).json({ success: false, msg: "Student not found" });
    }
    return res.json({ success: true, student });
  } catch (error) {
    console.error("Error fetching student profile:", error);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

module.exports.getAllSessions = async (req, res) => {
  try {
    const sessions = await sessionModel.find().populate("clubId", "-password");
    return res.json({ success: true, sessions });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

module.exports.getSession = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({ errors: errors.array(), success: false });
  }

  const { sessionId } = req.query;

  try {
    const session = await sessionModel
      .findById(sessionId)
      .populate("clubId", "-password");
    if (!session) {
      return res.json({ success: false, msg: "Session not found" });
    }
    return res.json({ success: true, session });
  } catch (error) {
    console.error("Error fetching session:", error);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

module.exports.getAllClubs = async (req, res) => {
  try {
    const clubs = await clubModel.find();
    return res.json({ success: true, clubs });
  } catch (error) {

    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

module.exports.getClub = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({ errors: errors.array(), success: false });
  }

  const { clubId } = req.query;

  try {
    const club = await clubModel.findById(clubId);
    if (!club) {
      return res.json({ success: false, msg: "Club not found" });
    }
    return res.json({ success: true, club });
  } catch (error) {
    
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

module.exports.getAllEvents = async (req, res) => {
  try {
    const events = await eventModel.find().populate("clubId", "-password");
    return res.json({ success: true, events });
  } catch (error) {

    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

module.exports.getEvent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({ errors: errors.array(), success: false });
  }

  const { eventId } = req.query;

  try {
    const event = await eventModel
      .findById(eventId)
      .populate("clubId", "-password");
    if (!event) {
      return res.json({ success: false, msg: "Event not found" });
    }
    return res.json({ success: true, event });
  } catch (error) {
   
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

module.exports.getClubEvents = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({ errors: errors.array(), success: false });
  }

  const { clubId } = req.query;

  try {
    const events = await eventModel
      .find({ clubId })
      .populate("clubId", "-password");
    return res.json({ success: true, events });
  } catch (error) {
    
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

module.exports.getClubSessions = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({ errors: errors.array(), success: false });
  }

  const { clubId } = req.query;

  try {
    const sessions = await sessionModel
      .find({ clubId })
      .populate("clubId", "-password");
    return res.json({ success: true, sessions });
  } catch (error) {
    
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

module.exports.getDashBoard = async (req, res, next) => {
  const events = await eventModel.find().populate("clubId", "-password");
  const sessions = await sessionModel.find().populate("clubId", "-password");
  return res.json({ success: true, events, sessions });
};

module.exports.registerEvent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({ errors: errors.array(), success: false });
    }

    const { eventId } = req.body;
    const studentId = req.student._id;

    const event = await eventModel.findById(eventId);
    if (!event) {
      return res.json({ success: false, msg: "Event not found" });
    }

    const alreadyRegistered = await registerationEventModel.findOne({
      eventId,
      studentId,
    });
    if (alreadyRegistered) {
      return res.json({
        success: false,
        msg: "Already registered for this event",
      });
    }

    let roundDetailsStudent = event.roundDetails;
    if (event.numberOfRounds && event.numberOfRounds > 0) {
      for (let i = 0; i < event.numberOfRounds; i++) {
        roundDetailsStudent[i] = {
          ...roundDetailsStudent[i],
          selected: false,
          roundDate: null,
          remarks: "",
        };
      }
    }


    const registeration = await registerationEventModel.create({
      eventId,
      studentId,
      roundDetails: roundDetailsStudent,
      numberOfRounds: event.numberOfRounds,
    });

   

    return res.json({
      success: true,
      msg: "Registered successfully",
      registeration,
    });
  } catch (err) {
 
    return res.json({ success: false, msg: err.message || "Server error" });
  }
};

module.exports.getEventDetails = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({ errors: errors.array(), success: false });
  }

  const { eventId } = req.query;
  const studentId = req.student._id;

  const captainExists = await registerationEventModel
    .findOne({
      eventId,
      studentId,
    })
    .populate("eventId")
    .populate("studentId", "-password")
    .populate("membersAccepted", "-password");

  if (captainExists) {
    return res.json({ success: true, detail: captainExists, Show: 1 });
  }

  const memberAccepted = await registerationEventModel
    .findOne({
      eventId,
      membersAccepted: studentId, //{ $in: [studentId] }, thsi could be sued id we want to pass mutliple sutdentids and documents conatisn atlease one stidentdi
    })
    .populate("eventId")
    .populate("studentId", "-password")
    .populate("membersAccepted", "-password");

  if (memberAccepted) {
    return res.json({ success: true, detail: memberAccepted, Show: 2 });
  }

  const memberOffered = await registerationEventModel
    .find({
      eventId,
      membersOffered: studentId, //{ $in: [studentId] }, thsi could be sued id we want to pass mutliple sutdentids and documents conatisn atlease one stidentdi
    })
    .populate("eventId")
    .populate("studentId", "-password")
    .populate("membersAccepted", "-password");

  if (memberOffered && memberOffered.length > 0) {
    return res.json({ success: true, detail: memberOffered, Show: 3 });
  }

  const event = await eventModel.findById(eventId);
  if (!event) {
    return res.json({ success: false, msg: "Event not found" });
  }

  return res.json({ success: true, Show: 0, detail: event });
};

module.exports.addMemberOffer = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.json({ errors: error.array(), success: false });
  }

  const { eventId, memberEmail } = req.body;
  const captainId = req.student._id;

  try {
    const event = await eventModel.findById(eventId);
    if (!event) {
      return res.json({ success: false, msg: "Event not found" });
    }

    const member = await studentModel.findOne({ email: memberEmail });
    if (!member) {
      return res.json({ success: false, msg: "Member not found" });
    }

    const alreadyRegistered = await registerationEventModel.findOne({
      eventId,
      studentId: member._id,
    });
    if (alreadyRegistered) {
      return res.json({
        success: false,
        msg: "Member already registered for this event",
      });
    }

    if (member._id.toString() === captainId.toString()) {
      return res.json({ success: false, msg: "You cannot offer yourself" });
    }

    const alreadyAccepted = await registerationEventModel.findOne({
      eventId,
      studentId: captainId,
      membersAccepted: { $in: [member._id] },
    });
    if (alreadyAccepted) {
      return res.json({
        success: false,
        msg: "Member already accepted your offer for this event",
      });
    }

    const alreadyAcceptedSomeoneElse = await registerationEventModel.findOne({
      eventId,
      membersAccepted: { $in: [member._id] },
    });
    if (alreadyAcceptedSomeoneElse) {
      return res.json({
        success: false,
        msg: "Member already accepted offer from another captain for this event",
      });
    }

    const alreadyOffered = await registerationEventModel.findOne({
      eventId,
      studentId: captainId,
      membersOffered: { $in: [member._id] },
    });
    if (alreadyOffered) {
      return res.json({
        success: false,
        msg: "Member already offered by you for this event",
      });
    }

    const captainRegisteration = await registerationEventModel.findOne({
      eventId,
      studentId: captainId,
    });

    captainRegisteration.membersOffered.push(member._id);
    captainRegisteration.markModified("membersOffered");
    await captainRegisteration.save();

    return res.json({ success: true, msg: "Member offered successfully" });
  } catch (err) {
    
    return res.json({ success: false, msg: err.message || "Server error" });
  }
};

module.exports.acceptMemberOffer = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.json({ errors: error.array(), success: false });
  }

  const { eventId, studentId } = req.body;
  const memberId = req.student._id;

  try {
    const event = await eventModel.findById(eventId);
    if (!event) {
      return res.json({ success: false, msg: "Event not found" });
    }

    const captainRegisteration = await registerationEventModel.findOne({
      eventId,
      studentId: studentId,
    });

    if (!captainRegisteration) {
      return res.json({
        success: false,
        msg: "Captain registration not found",
      });
    }

    captainRegisteration.membersAccepted.push(memberId);
    captainRegisteration.membersOffered =
      captainRegisteration.membersOffered.filter(
        (id) => id.toString() !== memberId.toString()
      );
    captainRegisteration.markModified("membersAccepted");
    captainRegisteration.markModified("membersOffered");
    await captainRegisteration.save();

    return res.json({ success: true, msg: "Member accepted successfully" });
  } catch (err) {
    
    return res.json({ success: false, msg: err.message || "Server error" });
  }
};


module.exports.unregisteredAsCaptain = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.json({ errors: error.array(), success: false });
  }

  const { eventId } = req.body;
  const captainId = req.student._id;

  try {
    const event = await eventModel.findById(eventId);
    if (!event) {
      return res.json({ success: false, msg: "Event not found" });
    }

    await registerationEventModel.deleteOne({
      eventId,
      studentId: captainId,
    });

    return res.json({ success: true, msg: "Unregistered successfully" });
  } catch (err) {
    
    return res.json({ success: false, msg: err.message || "Server error" });
  }
}

module.exports.addTeamName = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.json({ errors: error.array(), success: false });
  }

  const { eventId, teamName } = req.body;
  const captainId = req.student._id;

  try {
    const event = await eventModel.findById(eventId);
    if (!event) {
      return res.json({ success: false, msg: "Event not found" });
    }

    const captainRegisteration = await registerationEventModel.findOne({
      eventId,
      studentId: captainId,
    });

    if (!captainRegisteration) {
      return res.json({
        success: false,
        msg: "Captain registration not found",
      });
    }

    captainRegisteration.teamName = teamName;
    captainRegisteration.markModified("teamName");
    await captainRegisteration.save();

    return res.json({ success: true, msg: "Team name added successfully" });
  } catch (err) {
    
    return res.json({ success: false, msg: err.message || "Server error" });
  }
};


module.exports.forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({ errors: errors.array(), success: false });
  }

  const { email, newPassword } = req.body;

  try {
    const student = await studentModel.findOne({ email });
    if (!student) {
      return res.json({ success: false, msg: "Student not found, first register" });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    student.password = hashedPassword;
    student.markModified("password");
    await student.save();

    return res.json({ success: true, msg: "Password updated successfully" });
  } catch (err) {
    return res.json({ success: false, msg: err.message || "Server error" });
  }
};
