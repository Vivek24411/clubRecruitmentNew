const { validationResult } = require("express-validator");
const clubModel = require("../models/club.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const sessionModel = require("../models/session.model");
const eventModel = require("../models/event.model");
const registerationEventModel = require("../models/registerationEvent.model");

module.exports.clubLogin = async (req, res) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return res.json({ errors: error.array(), success: false });
  }

  const { userName, password } = req.body;

  // Check if club with the given username exists
  const club = await clubModel.findOne({ userName });
  if (!club) {
    return res.json({ success: false, msg: "Invalid club credentials" });
  }

  // Compare the provided password with the stored hashed password
  const isMatch = await club.comparePassword(password);
  if (!isMatch) {
    return res.json({ success: false, msg: "Invalid club credentials" });
  }

  // Generate a JWT token for the authenticated club
  const token = await club.createToken();
  return res.json({ success: true, msg: "Club logged in successfully", token });
};

module.exports.addSession = async (req, res) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return res.json({ errors: error.array(), success: false });
  }

  const {
    title,
    shortDescription,
    date,
    time,
    duration,
    longDescription,
    venue,
  } = req.body;

  try {
    const session = await sessionModel.create({
      clubId: req.club._id,
      title,
      shortDescription,
      date,
      time,
      duration,
      longDescription,
      venue,
    });

    return res.json({
      success: true,
      msg: "Session added successfully",
      session,
    });
  } catch (err) {
    console.error("Error creating session:", err);
    return res
      .status(500)
      .json({ success: false, msg: "Failed to create session" });
  }
};

module.exports.getProfile = async (req, res) => {
  try {
    const club = await clubModel.findById(req.club._id).select("-password");
    if (!club) {
      return res.json({ success: false, msg: "Club not found" });
    }
    return res.json({ success: true, club });
  } catch (err) {
    
    return res.json({ success: false, msg: "Failed to fetch club profile" });
  }
};

module.exports.updateProfile = async (req, res) => {
 

  const error = validationResult(req);

  if (!error.isEmpty()) {
    return res.json({ errors: error.array(), success: false });
  }

  const updateData = req.body;

  try {
    const club = await clubModel
      .findByIdAndUpdate(req.club._id, updateData, { new: true })
      .select("-password");
    if (!club) {
      return res.json({ success: false, msg: "Club not found" });
    }
    return res.json({
      success: true,
      msg: "Profile updated successfully",
      club,
    });
  } catch (err) {
    
    return res.json({ success: false, msg: "Failed to update club profile" });
  }
};

module.exports.getSessions = async (req, res) => {
  try {
    const sessions = await sessionModel.find({ clubId: req.club._id });
    return res.json({ success: true, sessions });
  } catch (err) {
   
    return res.json({ success: false, msg: "Failed to fetch sessions" });
  }
};

module.exports.getSession = async (req, res) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return res.json({ errors: error.array(), success: false });
  }

  const { sessionId } = req.query;

  try {
    const session = await sessionModel.findOne({
      _id: sessionId,
      clubId: req.club._id,
    });
    if (!session) {
      return res.json({ success: false, msg: "Session not found" });
    }
    return res.json({ success: true, session });
  } catch (err) {
   
    return res.json({ success: false, msg: "Failed to fetch session details" });
  }
};

module.exports.addEvent = async (req, res) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return res.json({ errors: error.array(), success: false });
  }

  // Extract basic fields from the request body
  const {
    title,
    shortDescription,
    longDescription,
    registerationDeadline,
    maxParticipants,
    eligibility,
    numberOfRounds,
  } = req.body;
  
  // Handle ContactInfo array properly
  let ContactInfo = [];
  
  // Check if there are any ContactInfo fields in the request
  if (req.body['ContactInfo[0]'] !== undefined) {
    // Collect all ContactInfo items
    let i = 0;
    while (req.body[`ContactInfo[${i}]`] !== undefined) {
      ContactInfo.push(req.body[`ContactInfo[${i}]`]);
      i++;
    }
  }
  
  // Handle roundDetails
  let roundDetails = [];
  if (req.body.roundDetailsJSON) {
    try {
      roundDetails = JSON.parse(req.body.roundDetailsJSON);
    } catch (err) {
      console.error("Error parsing roundDetails:", err);
    }
  }


  let eventBanner = "";
  let eventBannerPublicId = "";

  if(req.file){
   
    eventBanner = req.file.path
    eventBannerPublicId = req.file.filename
  }


  try {
    // Log the data being saved to help with debugging
   
    const event = await eventModel.create({
      clubId: req.club._id,
      title,
      shortDescription,
      longDescription,
      registerationDeadline,
      maxParticipants,
      ContactInfo,
      roundDetails,
      eligibility,
      numberOfRounds,
      eventBanner,
      eventBannerPublicId
    });

    return res.json({ success: true, msg: "Event added successfully", event });
  } catch (err) {
    console.error("Error creating event:", err);
    return res.status(500).json({ 
      success: false, 
      msg: "Failed to create event",
      error: err.message 
    });
  }
};

module.exports.getEvents = async (req, res) => {
  try {
    const events = await eventModel.find({ clubId: req.club._id });
    return res.json({ success: true, events });
  } catch (err) {
    console.error("Error fetching events:", err);
    return res.json({ success: false, msg: "Failed to fetch events" });
  }
};

module.exports.getEvent = async (req, res) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return res.json({ errors: error.array(), success: false });
  }

  const { eventId } = req.query;

  try {
    const event = await eventModel.findOne({
      _id: eventId,
      clubId: req.club._id,
    });
   

    if (!event) {
      return res.json({ success: false, msg: "Event not found" });
    }
    return res.json({ success: true, event });
  } catch (err) {
    console.error("Error fetching event details:", err);
    return res.json({ success: false, msg: "Failed to fetch event details" });
  }
};

module.exports.getDashBoard = async (req, res) => {
  try {
    const events = await eventModel.find({ clubId: req.club._id });
    const sessions = await sessionModel.find({ clubId: req.club._id });
    return res.json({ success: true, events, sessions });
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    return res.json({ success: false, msg: "Failed to fetch dashboard data" });
  }
}

module.exports.getEventsRegisteredStudents = async (req, res) => {
  try {
    const error = validationResult(req);

    if (!error.isEmpty()) {
      return res.json({ errors: error.array(), success: false });
    }

    const { eventId } = req.query;

    const registeredStudents = await registerationEventModel.find({ eventId: eventId }).populate('studentId', '-password').populate('eventId').populate('membersAccepted', '-password');

    return res.json({ success: true, registeredStudents });
  } catch (err) {
    
    return res.json({ success: false, msg: "Failed to fetch registered students" });
  }
};

module.exports.finalizeStudent = async (req, res) => {
  try {
    const error = validationResult(req);

    if (!error.isEmpty()) {
      return res.json({ errors: error.array(), success: false });
    }

    const { eventId, studentId } = req.body;

    const registration = await registerationEventModel.findOne({ eventId: eventId, studentId: studentId });

    if (!registration) {
      return res.json({ success: false, msg: "Registration not found" });
    }

    registration.roundDetails[registration.numberOfRounds-1].selected = true;

    // Mark the subdocument as modified so Mongoose knows to save it
    registration.markModified('roundDetails');

    await registration.save();

    return res.json({ success: true, msg: "Student finalized successfully" });
  } catch (err) {
    console.error("Error finalizing student:", err);
    return res.json({ success: false, msg: "Failed to finalize student" });
  }
}

module.exports.scheduleInterview = async (req, res) => {
  try {
    const error = validationResult(req);

    if (!error.isEmpty()) {
      return res.json({ errors: error.array(), success: false });
    }

    const { eventId, studentId, roundNumber, roundDate } = req.body;

    const registration = await registerationEventModel.findOne({ eventId: eventId, studentId: studentId });

    if (!registration) {
      return res.json({ success: false, msg: "Registration not found" });
    }


    
    registration.roundDetails[roundNumber-1].roundDate = roundDate;



    // Mark the subdocument as modified so Mongoose knows to save it
    registration.markModified('roundDetails');

    await registration.save();

    const registrationupdated = await registerationEventModel.findOne({ eventId: eventId, studentId: studentId });



    return res.json({ success: true, msg: "Interview scheduled successfully" });
  } catch (err) {
    console.error("Error scheduling interview:", err);
    return res.json({ success: false, msg: "Failed to schedule interview" });
  }
}


module.exports.selectStudentForRound = async (req, res) => {
  try {
    const error = validationResult(req);

    if (!error.isEmpty()) {
      return res.json({ errors: error.array(), success: false });
    }

    const { eventId, studentId, roundNumber } = req.body;

    const registration = await registerationEventModel.findOne({ eventId: eventId, studentId: studentId });

    if (!registration) {
      return res.json({ success: false, msg: "Registration not found" });
    }

    registration.roundDetails[roundNumber-1].selected = true;


    // Mark the subdocument as modified so Mongoose knows to save it
    registration.markModified('roundDetails');
    await registration.save();

    

    return res.json({ success: true, msg: "Student selected for round successfully" });
  } catch (err) {
    console.error("Error selecting student for round:", err);
    return res.json({ success: false, msg: "Failed to select student for round" });
  }
}