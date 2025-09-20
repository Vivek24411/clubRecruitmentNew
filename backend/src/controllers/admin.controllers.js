const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const clubModel = require("../models/club.model");
const sessionModel = require("../models/session.model");
const eventModel = require("../models/event.model");
const studentModel = require("../models/student.model");

module.exports.login = async (req, res) => {
  console.log("hii");

  const error = validationResult(req);

  if (!error.isEmpty()) {
    return res.json({ errors: "error.array()", success: false });
  }

  const { email, password } = req.body;


  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign({ email }, process.env.JWT_SECRET);
    return res.json({
      success: true,
      msg: "Admin logged in successfully",
      token,
    });
  } else {
    return res.json({ success: false, msg: "Invalid admin credentials" });
  }
};

module.exports.getProfile = async (req, res) => {
  res.json({ success: true, profile: { email: req.admin.email } });
};

module.exports.addClub = async (req, res) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return res.json({ errors: error.array(), success: false });
  }

  const { name, userName, password } = req.body;
  const clubLogo = req.file ? req.file.path : null;
  const clubLogoPublicId = req.file ? req.file.filename : null;

 


  const club = await clubModel.findOne({ userName });
  if (club) {
    return res.json({
      success: false,
      msg: "Club with this username already exists",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newClub = await clubModel.create({ name, userName, password: hashedPassword, clubLogo, clubLogoPublicId });
  return res.json({
    success: true,
    msg: "Club added successfully",
    club: newClub,
  });
};

module.exports.getAllSessions = async (req, res) => {
  try{
    const sessions = await sessionModel.find().populate('clubId', '-password');
    res.json({ success: true, sessions, msg: "Sessions fetched successfully" });
  } catch (error) {
    res.json({ success: false, msg: "Error fetching sessions", error });
  }
};


module.exports.getSessionDetail = async (req, res) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return res.json({ errors: error.array(), success: false });
  }

  const { sessionId } = req.query;

  try {
    const session = await sessionModel.findById(sessionId).populate('clubId', '-password');
    if (!session) {
      return res.json({ success: false, msg: "Session not found" });
    }
    res.json({ success: true, session, msg: "Session details fetched successfully" });
  } catch (error) {
    res.json({ success: false, msg: "Error fetching session details", error });
  }
}

module.exports.getAllClubs = async (req, res) => {
  try {
    const clubs = await clubModel.find().select('-password');
    res.json({ success: true, clubs, msg: "Clubs fetched successfully" });
  } catch (error) {
    res.json({ success: false, msg: "Error fetching clubs", error });
  }
}

module.exports.getClubDetail = async (req, res) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return res.json({ errors: error.array(), success: false });
  }

  const { clubId } = req.query;

  try {
    const club = await clubModel.findById(clubId).select('-password');
    if (!club) {
      return res.json({ success: false, msg: "Club not found" });
    }
    res.json({ success: true, club, msg: "Club details fetched successfully" });
  } catch (error) {
    res.json({ success: false, msg: "Error fetching club details", error });
  }
}

module.exports.getAllEvents = async (req, res) => {
  try {
    const events = await eventModel.find().populate('clubId', '-password');
    res.json({ success: true, events, msg: "Events fetched successfully" });
  } catch (error) {
    res.json({ success: false, msg: "Error fetching events", error });
  }
}

module.exports.getEventDetail = async (req, res) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return res.json({ errors: error.array(), success: false });
  }

  const { eventId } = req.query;

  try {
    const event = await eventModel.findById(eventId).populate('clubId', '-password');
    if (!event) {
      return res.json({ success: false, msg: "Event not found" });
    }
    res.json({ success: true, event, msg: "Event details fetched successfully" });
  } catch (error) {
    res.json({ success: false, msg: "Error fetching event details", error });
  }
} 

module.exports.getDashBoard = async (req, res) => {
  try {
    const clubsCount = await clubModel.countDocuments();
    const sessionsCount = await sessionModel.countDocuments();
    const eventsCount = await eventModel.countDocuments();

    const studentsCount = await studentModel.countDocuments();

    const sessions = await sessionModel.find();
    const events = await eventModel.find();



    res.json({ success: true, dashboard: { clubsCount, sessionsCount, eventsCount, studentsCount, sessions, events }, msg: "Dashboard data fetched successfully" });
  } catch (error) {
    res.json({ success: false, msg: "Error fetching dashboard data", error });
  }
}