const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const clubModel = require("../models/club.model");
const otpModel = require("../models/otp.model");
const verificationTokenModel = require("../models/verificationToken.model");
const sessionModel = require("../models/session.model");
const eventModel = require("../models/event.model");
const registerationEventModel = require("../models/registerationEvent.model");
const sessionRsvpModel = require("../models/sessionRsvp.model");
const roundCandidateModel = require("../models/roundCandidate.model");
const studentModel = require("../models/student.model");
const { clearSessionCookie, setSessionCookie } = require("../utils/auth");
const { notifyStudent, notifyTeam } = require("../services/notification.services");
const { sendOtp } = require("../services/student.services");
const { writeAudit } = require("../services/audit.services");
const { destroyCloudinaryImage, destroyUploadedFile } = require("../utils/uploads");
const {
  ensureEventRounds,
  normalizeRounds,
} = require("../services/eventWorkflow.services");
const DUMMY_PASSWORD_HASH = "$2b$12$4Qj6z7mmoEgcnxHLS0xDR.jjYdMm05/mtrLZVBInMaqjKAuvz9taa";
const CLUB_PASSWORD_RESET_PURPOSE = "club_password_reset";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizeUserName = (userName) => String(userName || "").trim().toLowerCase();
const tokenHash = (token) => crypto.createHash("sha256").update(token).digest("hex");
const clubRecoveryKey = (userName, email) =>
  `club:${normalizeUserName(userName)}:${normalizeEmail(email)}`;

async function consumeClubResetToken({ userName, email, token }) {
  if (!token) return null;
  return verificationTokenModel.findOneAndDelete({
    email: clubRecoveryKey(userName, email),
    purpose: CLUB_PASSWORD_RESET_PURPOSE,
    tokenHash: tokenHash(token),
    expiresAt: { $gt: new Date() },
  });
}

async function ownedEvent(eventId, clubId) {
  return eventModel.findOne({ _id: eventId, clubId });
}

function normalizedRoundDetails(rounds) {
  return rounds.map((round, index) => {
    const normalized = {
      Round: index + 1,
      Type: String(round.Type || "").trim().slice(0, 100),
    };
    if (round.TestDate) normalized.TestDate = String(round.TestDate).slice(0, 10);
    if (round.SubmissionDeadline) normalized.SubmissionDeadline = String(round.SubmissionDeadline).slice(0, 10);
    if (round.GoogleFormLink) normalized.GoogleFormLink = String(round.GoogleFormLink).trim().slice(0, 500);
    return normalized;
  });
}

function parsedArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

module.exports.clubLogin = async (req, res) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return res.json({ errors: error.array(), success: false });
  }

  const userName = req.body.userName.trim().toLowerCase();
  const { password } = req.body;

  // Check if club with the given username exists
  const club = await clubModel.findOne({ userName }).select("+password +tokenVersion");
  if (!club) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    return res.json({ success: false, msg: "Invalid club credentials" });
  }

  // Compare the provided password with the stored hashed password
  const isMatch = await club.comparePassword(password);
  if (!isMatch) {
    return res.json({ success: false, msg: "Invalid club credentials" });
  }
  if (club.status === "suspended") {
    return res.status(403).json({ success: false, msg: "Club account is suspended" });
  }

  // Generate a JWT token for the authenticated club
  const token = await club.createToken();
  setSessionCookie(res, "club", token);
  await writeAudit({ actorRole: "club", actorId: club._id, action: "auth.login", targetType: "club", targetId: club._id });
  return res.json({ success: true, msg: "Club logged in successfully", token });
};

module.exports.logout = async (req, res) => {
  clearSessionCookie(res, "club");
  return res.json({ success: true, msg: "Logged out successfully" });
};

module.exports.changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array(), success: false, msg: "Enter valid password details" });
  }

  const { currentPassword, newPassword } = req.body;

  try {
    const club = await clubModel.findById(req.club._id).select("+password +tokenVersion");
    if (!club || !(await bcrypt.compare(currentPassword, club.password))) {
      return res.status(400).json({ success: false, msg: "Current password is incorrect" });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, msg: "New password must be different from the current password" });
    }

    club.password = await bcrypt.hash(newPassword, 12);
    club.tokenVersion = (club.tokenVersion || 0) + 1;
    await club.save();
    await writeAudit({
      actorRole: "club",
      actorId: club._id,
      action: "auth.password_change",
      targetType: "club",
      targetId: club._id,
    });

    clearSessionCookie(res, "club");
    return res.json({ success: true, msg: "Password changed successfully; existing sessions were revoked" });
  } catch (error) {
    console.error("Club password change failed:", error);
    return res.status(500).json({ success: false, msg: "Unable to change password. Please try again" });
  }
};

module.exports.sendPasswordResetOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array(), success: false, msg: "Enter valid account details" });
  }

  const userName = normalizeUserName(req.body.userName);
  const email = normalizeEmail(req.body.email);
  const recoveryKey = clubRecoveryKey(userName, email);
  const genericMessage = "If those details match a club account, an OTP has been sent";

  try {
    const club = await clubModel.findOne({ userName }).select("accountEmail contactEmail");
    const accountMatches = club && normalizeEmail(club.accountEmail || club.contactEmail) === email;
    const otp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);

    if (!accountMatches) {
      return res.json({ success: true, msg: genericMessage });
    }

    await otpModel.findOneAndUpdate(
      { email: recoveryKey, purpose: CLUB_PASSWORD_RESET_PURPOSE },
      { otp: hashedOtp, attempts: 0, createdAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await sendOtp(email, otp);

    return res.json({ success: true, msg: genericMessage });
  } catch (error) {
    console.error("Club password reset OTP failed:", error);
    return res.status(500).json({ success: false, msg: "Unable to send OTP. Please try again" });
  }
};

module.exports.verifyPasswordResetOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array(), success: false, msg: "Enter a valid 6-digit OTP" });
  }

  const recoveryKey = clubRecoveryKey(req.body.userName, req.body.email);

  try {
    const otpRecord = await otpModel.findOne({
      email: recoveryKey,
      purpose: CLUB_PASSWORD_RESET_PURPOSE,
      createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) },
    });
    if (!otpRecord) {
      return res.status(400).json({ success: false, msg: "OTP expired or not found" });
    }

    const isMatch = await bcrypt.compare(req.body.otp, otpRecord.otp);
    if (!isMatch) {
      otpRecord.attempts += 1;
      if (otpRecord.attempts >= 5) await otpModel.deleteOne({ _id: otpRecord._id });
      else await otpRecord.save();
      return res.status(400).json({ success: false, msg: "Invalid OTP" });
    }

    await otpModel.deleteOne({ _id: otpRecord._id });
    await verificationTokenModel.deleteMany({
      email: recoveryKey,
      purpose: CLUB_PASSWORD_RESET_PURPOSE,
    });
    const verificationToken = crypto.randomBytes(32).toString("base64url");
    await verificationTokenModel.create({
      email: recoveryKey,
      purpose: CLUB_PASSWORD_RESET_PURPOSE,
      tokenHash: tokenHash(verificationToken),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    return res.json({ success: true, verificationToken });
  } catch (error) {
    console.error("Club password reset OTP verification failed:", error);
    return res.status(500).json({ success: false, msg: "Unable to verify OTP. Please try again" });
  }
};

module.exports.resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array(), success: false, msg: "Enter a valid new password" });
  }

  const userName = normalizeUserName(req.body.userName);
  const email = normalizeEmail(req.body.email);

  try {
    const verified = await consumeClubResetToken({
      userName,
      email,
      token: req.body.resetToken,
    });
    if (!verified) {
      return res.status(400).json({ success: false, msg: "Reset verification expired or invalid" });
    }

    const club = await clubModel.findOne({ userName }).select("+password +tokenVersion accountEmail contactEmail");
    if (!club || normalizeEmail(club.accountEmail || club.contactEmail) !== email) {
      return res.status(400).json({ success: false, msg: "Reset verification expired or invalid" });
    }

    club.password = await bcrypt.hash(req.body.newPassword, 12);
    club.tokenVersion = (club.tokenVersion || 0) + 1;
    await club.save();
    await writeAudit({
      actorRole: "club",
      actorId: club._id,
      action: "auth.password_reset",
      targetType: "club",
      targetId: club._id,
    });

    clearSessionCookie(res, "club");
    return res.json({ success: true, msg: "Password reset successfully; existing sessions were revoked" });
  } catch (error) {
    console.error("Club password reset failed:", error);
    return res.status(500).json({ success: false, msg: "Unable to reset password. Please try again" });
  }
};

module.exports.addSession = async (req, res) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    await destroyUploadedFile(req.file);
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
      status: req.body.status || "published",
      capacity: req.body.capacity || null,
      sessionThumbnail: req.file?.path || "",
      sessionThumbnailPublicId: req.file?.filename || "",
    });

    await writeAudit({ actorRole: "club", actorId: req.club._id, action: "session.create", targetType: "session", targetId: session._id });

    return res.json({
      success: true,
      msg: "Session added successfully",
      session,
    });
  } catch (err) {
    await destroyUploadedFile(req.file);
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

  const allowedFields = [
    "name", "userName", "shortDescription", "longDescription", "website",
    "linkedin", "instagram", "achivements", "recruitmentMethods",
    "contactEmail", "contactPhone",
  ];
  const updateData = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
  );
  if (req.body.useAccountEmailForContact === true || req.body.useAccountEmailForContact === "true") {
    updateData.contactEmail = req.club.accountEmail || req.club.contactEmail;
  }
  if (req.body.resourcesJSON !== undefined) {
    updateData.resources = parsedArray(req.body.resourcesJSON).slice(0, 50).map((resource) => ({
      title: String(resource.title || "").trim().slice(0, 150),
      description: String(resource.description || "").trim().slice(0, 1000),
      url: String(resource.url || "").trim().slice(0, 2048),
      type: ["link", "document", "video", "repository", "other"].includes(resource.type) ? resource.type : "link",
    })).filter((resource) => resource.title && resource.url);
  }
  if (req.body.annualEventsJSON !== undefined) {
    updateData.annualEvents = parsedArray(req.body.annualEventsJSON).slice(0, 30).map((annualEvent) => ({
      name: String(annualEvent.name || "").trim().slice(0, 150),
      description: String(annualEvent.description || "").trim().slice(0, 3000),
      eligibility: String(annualEvent.eligibility || "").trim().slice(0, 1000),
      perks: String(annualEvent.perks || "").trim().slice(0, 1000),
      tentativeDate: String(annualEvent.tentativeDate || "").trim().slice(0, 100),
      url: String(annualEvent.url || "").trim().slice(0, 2048),
    })).filter((annualEvent) => annualEvent.name);
  }

  const oldLogoPublicId = req.club.clubLogoPublicId;
  if (req.file) {
    updateData.clubLogo = req.file.path;
    updateData.clubLogoPublicId = req.file.filename;
  }

  try {
    const club = await clubModel
      .findByIdAndUpdate(req.club._id, updateData, { new: true, runValidators: true })
      .select("-password");
    if (!club) {
      await destroyUploadedFile(req.file);
      return res.json({ success: false, msg: "Club not found" });
    }
    if (req.file && oldLogoPublicId && oldLogoPublicId !== req.file.filename) {
      await destroyCloudinaryImage(oldLogoPublicId);
    }
    await writeAudit({ actorRole: "club", actorId: req.club._id, action: "profile.update", targetType: "club", targetId: req.club._id, metadata: { fields: Object.keys(updateData) } });
    return res.json({
      success: true,
      msg: "Profile updated successfully",
      club,
    });
  } catch (err) {
    await destroyUploadedFile(req.file);
    return res.status(400).json({ success: false, msg: err?.code === 11000 ? "Club name or username is already in use" : "Failed to update club profile" });
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
    await destroyUploadedFile(req.file);
    return res.status(400).json({ errors: error.array(), success: false, msg: "Please correct the event details" });
  }

  // Extract basic fields from the request body
  const {
    title,
    shortDescription,
    longDescription,
    registerationDeadline,
    registrationDeadlineAt,
    maxParticipants,
    eligibility,
    numberOfRounds,
    registrationType,
    minTeamSize,
    maxTeamSize,
    status,
    eventType,
  } = req.body;
  
  // Handle ContactInfo array properly
  let ContactInfo = [];
  
  // Check if there are any ContactInfo fields in the request
  if (req.body['ContactInfo[0]'] !== undefined) {
    // Collect all ContactInfo items
    let i = 0;
    while (req.body[`ContactInfo[${i}]`] !== undefined) {
      if (i < 10) ContactInfo.push(String(req.body[`ContactInfo[${i}]`]).trim().slice(0, 200));
      i++;
    }
  }
  
  const rawRounds = parsedArray(req.body.roundsJSON || req.body.roundDetailsJSON);
  const rounds = normalizeRounds(rawRounds).map((round) => ({
    ...round,
    evaluationScope: (registrationType === "individual" || round.type === "test")
      ? "participant"
      : round.evaluationScope,
  }));
  const roundDetails = req.body.roundsJSON ? [] : normalizedRoundDetails(rawRounds);
  const eligibilityYears = parsedArray(req.body.eligibilityYearsJSON)
    .map(Number).filter((year) => year >= 1 && year <= 5);
  const eligibilityBranches = parsedArray(req.body.eligibilityBranchesJSON)
    .map((branch) => String(branch).trim()).filter(Boolean).slice(0, 100);


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
      maxParticipants: maxParticipants ? Number(maxParticipants) : null,
      maxTeamSize: Number(maxTeamSize || 1),
      minTeamSize: Number(minTeamSize || 1),
      registrationType: registrationType || "team",
      registrationDeadlineAt: registrationDeadlineAt
        ? new Date(registrationDeadlineAt)
        : registerationDeadline
          ? new Date(`${registerationDeadline}T23:59:59.999+05:30`)
          : null,
      ContactInfo,
      roundDetails,
      eligibility,
      eventBanner,
      eventBannerPublicId,
      status: status || "published",
      eventType: eventType || "recruitment",
      rounds,
      numberOfRounds: rounds.length,
      eligibilityYears,
      eligibilityBranches,
      allowPassedOut: req.body.allowPassedOut === true || req.body.allowPassedOut === "true",
      deadlineNotificationsEnabled: req.body.deadlineNotificationsEnabled !== "false",
    });

    await writeAudit({ actorRole: "club", actorId: req.club._id, action: "event.create", targetType: "event", targetId: event._id, metadata: { status: event.status } });

    return res.json({ success: true, msg: "Event added successfully", event });
  } catch (err) {
    await destroyUploadedFile(req.file);
    console.error("Error creating event:", err);
    return res.status(500).json({ 
      success: false, 
      msg: "Failed to create event",
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
    await ensureEventRounds(event);
   

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

    const event = await ownedEvent(eventId, req.club._id);
    if (!event) return res.status(404).json({ success: false, msg: "Event not found" });

    const registeredStudents = await registerationEventModel.find({ eventId: event._id }).populate('studentId').populate('eventId').populate('membersAccepted');

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

    const event = await ownedEvent(eventId, req.club._id);
    if (!event) return res.status(404).json({ success: false, msg: "Event not found" });
    const registration = await registerationEventModel.findOne({ eventId: event._id, studentId: studentId });

    if (!registration) {
      return res.json({ success: false, msg: "Registration not found" });
    }
    if (registration.overallStatus === "withdrawn") return res.status(409).json({ success: false, msg: "This application was withdrawn by the student" });
    const teamSize = 1 + (registration.membersAccepted?.length || 0);
    if (event.registrationType !== "individual" && teamSize < (event.minTeamSize || 1)) {
      return res.status(400).json({ success: false, msg: "The team does not meet the event's minimum size" });
    }

    if (!registration.numberOfRounds || !registration.roundDetails[registration.numberOfRounds - 1]) {
      return res.status(400).json({ success: false, msg: "Final round is not configured" });
    }
    registration.roundDetails[registration.numberOfRounds-1].selected = true;
    registration.overallStatus = "selected";

    // Mark the subdocument as modified so Mongoose knows to save it
    registration.markModified('roundDetails');

    await registration.save();

    await notifyTeam(registration, {
      type: "application_selected",
      title: `Selected for ${event.title}`,
      message: "Congratulations! Your team completed the final recruitment round.",
      link: `/event/${eventId}`,
    });
    await writeAudit({ actorRole: "club", actorId: req.club._id, action: "application.finalize", targetType: "registration", targetId: registration._id });

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

    const event = await ownedEvent(eventId, req.club._id);
    if (!event) return res.status(404).json({ success: false, msg: "Event not found" });
    const registration = await registerationEventModel.findOne({ eventId: event._id, studentId: studentId });

    if (!registration) {
      return res.json({ success: false, msg: "Registration not found" });
    }
    if (registration.overallStatus === "withdrawn") return res.status(409).json({ success: false, msg: "This application was withdrawn by the student" });


    
    if (roundNumber < 1 || roundNumber > registration.numberOfRounds || !registration.roundDetails[roundNumber - 1]) {
      return res.status(400).json({ success: false, msg: "Invalid round number" });
    }
    registration.roundDetails[roundNumber-1].roundDate = roundDate;
    registration.roundDetails[roundNumber-1].status = "scheduled";
    registration.currentRound = roundNumber;
    registration.overallStatus = "in_progress";



    // Mark the subdocument as modified so Mongoose knows to save it
    registration.markModified('roundDetails');

    await registration.save();

    await notifyTeam(registration, {
      type: "round_scheduled",
      title: `Round ${roundNumber} scheduled`,
      message: `Your next round for ${event.title} is scheduled for ${roundDate}.`,
      link: `/event/${eventId}`,
    });
    await writeAudit({ actorRole: "club", actorId: req.club._id, action: "application.round_schedule", targetType: "registration", targetId: registration._id, metadata: { roundNumber, roundDate } });

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

    const event = await ownedEvent(eventId, req.club._id);
    if (!event) return res.status(404).json({ success: false, msg: "Event not found" });
    const registration = await registerationEventModel.findOne({ eventId: event._id, studentId: studentId });

    if (!registration) {
      return res.json({ success: false, msg: "Registration not found" });
    }
    if (registration.overallStatus === "withdrawn") return res.status(409).json({ success: false, msg: "This application was withdrawn by the student" });

    if (roundNumber < 1 || roundNumber > registration.numberOfRounds || !registration.roundDetails[roundNumber - 1]) {
      return res.status(400).json({ success: false, msg: "Invalid round number" });
    }
    registration.roundDetails[roundNumber-1].selected = true;
    registration.roundDetails[roundNumber-1].status = "cleared";
    registration.currentRound = Math.min(roundNumber + 1, registration.numberOfRounds);
    registration.overallStatus = "in_progress";


    // Mark the subdocument as modified so Mongoose knows to save it
    registration.markModified('roundDetails');
    await registration.save();

    await notifyTeam(registration, {
      type: "round_cleared",
      title: `Round ${roundNumber} cleared`,
      message: roundNumber === registration.numberOfRounds
        ? "Your team cleared the final round."
        : `Your team progressed to round ${roundNumber + 1}.`,
      link: `/event/${eventId}`,
    });
    await writeAudit({ actorRole: "club", actorId: req.club._id, action: "application.round_clear", targetType: "registration", targetId: registration._id, metadata: { roundNumber } });

    

    return res.json({ success: true, msg: "Student selected for round successfully" });
  } catch (err) {
    console.error("Error selecting student for round:", err);
    return res.json({ success: false, msg: "Failed to select student for round" });
  }
}

module.exports.updateEvent = async (req, res) => {
  const event = await ownedEvent(req.params.eventId, req.club._id);
  if (!event) {
    await destroyUploadedFile(req.file);
    return res.status(404).json({ success: false, msg: "Event not found" });
  }

  const previousDeadline = event.registrationDeadlineAt ? new Date(event.registrationDeadlineAt) : null;
  const previousRoundDeadlines = new Map((event.rounds || []).map((round) => [
    String(round._id),
    round.submissionDeadlineAt ? new Date(round.submissionDeadlineAt).toISOString() : "",
  ]));
  const allowedFields = [
    "title", "shortDescription", "longDescription", "eligibility", "ContactInfo",
    "registrationType", "minTeamSize", "maxTeamSize",
    "numberOfRounds", "registerationDeadline", "eventType", "deadlineNotificationsEnabled",
  ];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) event[field] = req.body[field];
  }
  if (req.body.maxParticipants !== undefined) {
    event.maxParticipants = req.body.maxParticipants ? Number(req.body.maxParticipants) : null;
  }
  if (req.body.registrationDeadlineAt !== undefined || req.body.registerationDeadline !== undefined) {
    event.registrationDeadlineAt = req.body.registrationDeadlineAt
      ? new Date(req.body.registrationDeadlineAt)
      : req.body.registerationDeadline
        ? new Date(`${req.body.registerationDeadline}T23:59:59.999+05:30`)
        : null;
    if (event.registrationDeadlineAt) {
      event.registerationDeadline = event.registrationDeadlineAt.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    }
  }
  if (req.body.contactInfoJSON !== undefined) {
    event.ContactInfo = parsedArray(req.body.contactInfoJSON).map((item) => String(item).trim().slice(0, 200)).filter(Boolean).slice(0, 10);
  }
  if (req.body.eligibilityYearsJSON !== undefined) {
    event.eligibilityYears = parsedArray(req.body.eligibilityYearsJSON).map(Number).filter((year) => year >= 1 && year <= 5);
  }
  if (req.body.eligibilityBranchesJSON !== undefined) {
    event.eligibilityBranches = parsedArray(req.body.eligibilityBranchesJSON).map((branch) => String(branch).trim()).filter(Boolean).slice(0, 100);
  }
  if (req.body.allowPassedOut !== undefined) event.allowPassedOut = req.body.allowPassedOut === true || req.body.allowPassedOut === "true";
  if (req.body.roundsJSON !== undefined) {
    const rounds = normalizeRounds(parsedArray(req.body.roundsJSON)).map((round) => ({
      ...round,
      evaluationScope: (event.registrationType === "individual" || round.type === "test")
        ? "participant"
        : round.evaluationScope,
    }));
    const retainedRoundIds = new Set(rounds.filter((round) => round._id).map((round) => String(round._id)));
    const removedRoundIds = (event.rounds || []).filter((round) => !retainedRoundIds.has(String(round._id))).map((round) => round._id);
    if (removedRoundIds.length && await roundCandidateModel.exists({ eventId: event._id, roundId: { $in: removedRoundIds } })) {
      await destroyUploadedFile(req.file);
      return res.status(409).json({ success: false, msg: "A round with candidate activity cannot be removed. Keep it and edit its details instead" });
    }
    event.rounds = rounds;
    event.numberOfRounds = rounds.length;
  }
  const oldBannerPublicId = event.eventBannerPublicId;
  if (req.file) {
    event.eventBanner = req.file.path;
    event.eventBannerPublicId = req.file.filename;
  }
  try {
    await event.save();
  } catch (error) {
    await destroyUploadedFile(req.file);
    throw error;
  }
  if (req.file && oldBannerPublicId && oldBannerPublicId !== req.file.filename) {
    await destroyCloudinaryImage(oldBannerPublicId);
  }
  const registrationDeadlineChanged = String(previousDeadline?.toISOString() || "") !== String(event.registrationDeadlineAt?.toISOString() || "");
  const changedRoundDeadlines = (event.rounds || []).filter((round) =>
    previousRoundDeadlines.has(String(round._id))
    && previousRoundDeadlines.get(String(round._id)) !== String(round.submissionDeadlineAt?.toISOString() || ""));
  const deadlineChanged = registrationDeadlineChanged || changedRoundDeadlines.length > 0;
  const notifyDeadlineChange = req.body.notifyRegistrants === true || req.body.notifyRegistrants === "true";
  if (deadlineChanged && notifyDeadlineChange) {
    const registrations = await registerationEventModel.find({ eventId: event._id, overallStatus: { $ne: "withdrawn" } });
    await Promise.all(registrations.map((registration) => notifyTeam(registration, {
      type: "event_deadline_changed",
      title: `Deadline updated for ${event.title}`,
      message: registrationDeadlineChanged
        ? (event.registrationDeadlineAt
          ? `The registration deadline is now ${new Date(event.registrationDeadlineAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}.`
          : "The registration deadline was removed. Check the event page for current details.")
        : `${changedRoundDeadlines.map((round) => round.title).join(", ")} submission deadline was updated. Check the event page for the new timing.`,
      link: `/event/${event._id}`,
    })));
  }
  await writeAudit({ actorRole: "club", actorId: req.club._id, action: "event.update", targetType: "event", targetId: event._id });
  return res.json({ success: true, msg: "Event updated successfully", event });
};

module.exports.updateEventStatus = async (req, res) => {
  const event = await ownedEvent(req.params.eventId, req.club._id);
  if (!event) return res.status(404).json({ success: false, msg: "Event not found" });
  const previousStatus = event.status;
  event.status = req.body.status;
  if (event.status === "published" && !event.publishedAt) event.publishedAt = new Date();
  await event.save();
  if (previousStatus !== "cancelled" && event.status === "cancelled") {
    const registrations = await registerationEventModel.find({ eventId: event._id });
    await Promise.all(registrations.map((registration) => notifyTeam(registration, {
      type: "event_cancelled",
      title: `${event.title} was cancelled`,
      message: "The club cancelled this recruitment event. Your application history remains available.",
      link: "/applications",
    })));
  }
  await writeAudit({ actorRole: "club", actorId: req.club._id, action: `event.${event.status}`, targetType: "event", targetId: event._id });
  return res.json({ success: true, msg: `Event ${event.status}`, event });
};

module.exports.updateSession = async (req, res) => {
  const session = await sessionModel.findOne({ _id: req.params.sessionId, clubId: req.club._id });
  if (!session) {
    await destroyUploadedFile(req.file);
    return res.status(404).json({ success: false, msg: "Session not found" });
  }
  const previousStatus = session.status;
  const previousSchedule = { date: session.date, time: session.time, venue: session.venue };
  const previousThumbnailPublicId = session.sessionThumbnailPublicId;
  const confirmedCount = await sessionRsvpModel.countDocuments({
    sessionId: session._id,
    status: { $in: ["confirmed", "attended"] },
  });
  session.confirmedRsvpCount = confirmedCount;
  const allowedFields = ["title", "shortDescription", "longDescription", "date", "time", "duration", "venue", "capacity", "status"];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) session[field] = req.body[field];
  }
  if (req.file) {
    session.sessionThumbnail = req.file.path;
    session.sessionThumbnailPublicId = req.file.filename;
  }
  if (session.capacity && session.capacity < session.confirmedRsvpCount) {
    await destroyUploadedFile(req.file);
    return res.status(400).json({ success: false, msg: "Capacity cannot be lower than the confirmed RSVP count" });
  }
  try {
    await session.save();
  } catch (error) {
    await destroyUploadedFile(req.file);
    throw error;
  }
  if (req.file && previousThumbnailPublicId && previousThumbnailPublicId !== req.file.filename) {
    await destroyCloudinaryImage(previousThumbnailPublicId);
  }

  const sessionAt = new Date(`${session.date}T${session.time}:00+05:30`);
  const canPromoteWaitlist = session.status === "published" && !Number.isNaN(sessionAt.getTime()) && sessionAt > new Date();
  const waitlisted = canPromoteWaitlist
    ? await sessionRsvpModel.find({ sessionId: session._id, status: "waitlisted" }).sort({ createdAt: 1 })
    : [];
  const promotedStudents = [];
  for (const waitlistedRsvp of waitlisted) {
    let reserved;
    if (session.capacity) {
      reserved = await sessionModel.findOneAndUpdate(
        { _id: session._id, $expr: { $lt: [{ $ifNull: ["$confirmedRsvpCount", 0] }, "$capacity"] } },
        { $inc: { confirmedRsvpCount: 1 } },
        { new: true }
      );
    } else {
      reserved = await sessionModel.findOneAndUpdate(
        { _id: session._id },
        { $inc: { confirmedRsvpCount: 1 } },
        { new: true }
      );
    }
    if (!reserved) break;
    const promoted = await sessionRsvpModel.findOneAndUpdate(
      { _id: waitlistedRsvp._id, status: "waitlisted" },
      { status: "confirmed", updatedAt: new Date() },
      { new: true }
    );
    if (!promoted) {
      await sessionModel.updateOne({ _id: session._id, confirmedRsvpCount: { $gt: 0 } }, { $inc: { confirmedRsvpCount: -1 } });
      continue;
    }
    promotedStudents.push(promoted.studentId);
  }
  await Promise.all(promotedStudents.map((studentId) => notifyStudent(studentId, {
    type: "session_rsvp_promoted",
    title: `Your RSVP for ${session.title} is confirmed`,
    message: "The session capacity changed and a place is now available for you.",
    link: `/session/${session._id}`,
  })));
  if (previousStatus !== "cancelled" && session.status === "cancelled") {
    const activeRsvps = await sessionRsvpModel.find({ sessionId: session._id, status: { $in: ["confirmed", "waitlisted"] } });
    await Promise.all(activeRsvps.map((rsvp) => notifyStudent(rsvp.studentId, {
      type: "session_cancelled",
      title: `${session.title} was cancelled`,
      message: "The club cancelled this session.",
      link: "/sessions",
    })));
  }
  const scheduleChanged = ["date", "time", "venue"].some((field) => String(previousSchedule[field] || "") !== String(session[field] || ""));
  if (scheduleChanged && session.status !== "cancelled") {
    const activeRsvps = await sessionRsvpModel.find({ sessionId: session._id, status: { $in: ["confirmed", "waitlisted"] } });
    await Promise.all(activeRsvps.map((rsvp) => notifyStudent(rsvp.studentId, {
      type: "session_schedule_changed",
      title: `${session.title} schedule updated`,
      message: `The session is now scheduled for ${session.date} at ${session.time}${session.venue ? ` in ${session.venue}` : ""}.`,
      link: `/session/${session._id}`,
    })));
  }
  await writeAudit({ actorRole: "club", actorId: req.club._id, action: "session.update", targetType: "session", targetId: session._id });
  const updatedSession = await sessionModel.findById(session._id);
  return res.json({ success: true, msg: promotedStudents.length ? `Session updated and ${promotedStudents.length} waitlisted RSVP(s) confirmed` : "Session updated successfully", session: updatedSession });
};

module.exports.updateApplication = async (req, res) => {
  const event = await ownedEvent(req.params.eventId, req.club._id);
  if (!event) return res.status(404).json({ success: false, msg: "Event not found" });
  const registration = await registerationEventModel.findOne({ _id: req.params.registrationId, eventId: event._id });
  if (!registration) return res.status(404).json({ success: false, msg: "Application not found" });
  if (registration.overallStatus === "withdrawn" && req.body.overallStatus) {
    return res.status(409).json({ success: false, msg: "A student-withdrawn application cannot be reopened by a club" });
  }
  if (req.body.overallStatus === "selected") {
    const teamSize = 1 + (registration.membersAccepted?.length || 0);
    if (event.registrationType !== "individual" && teamSize < (event.minTeamSize || 1)) {
      return res.status(400).json({ success: false, msg: "The team does not meet the event's minimum size" });
    }
  }

  const allowedFields = ["overallStatus", "reviewerNotes", "score"];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) registration[field] = req.body[field];
  }
  await registration.save();
  if (req.body.overallStatus) {
    await notifyTeam(registration, {
      type: "application_status",
      title: `Application ${req.body.overallStatus.replace('_', ' ')}`,
      message: `Your application status for ${event.title} was updated.`,
      link: `/event/${event._id}`,
    });
  }
  await writeAudit({ actorRole: "club", actorId: req.club._id, action: "application.update", targetType: "registration", targetId: registration._id, metadata: { fields: Object.keys(req.body) } });
  return res.json({ success: true, msg: "Application updated", registration });
};

module.exports.bulkUpdateApplications = async (req, res) => {
  const event = await ownedEvent(req.params.eventId, req.club._id);
  if (!event) return res.status(404).json({ success: false, msg: "Event not found" });
  const registrationIds = req.body.registrationIds.slice(0, 100);
  const registrations = await registerationEventModel.find({ _id: { $in: registrationIds }, eventId: event._id, overallStatus: { $ne: "withdrawn" } });
  const eligibleRegistrations = registrations.filter((registration) => req.body.overallStatus !== "selected"
    || event.registrationType === "individual"
    || 1 + (registration.membersAccepted?.length || 0) >= (event.minTeamSize || 1));
  const eligibleIds = eligibleRegistrations.map((registration) => registration._id);
  const result = await registerationEventModel.updateMany(
    { _id: { $in: eligibleIds }, eventId: event._id },
    { $set: { overallStatus: req.body.overallStatus, updatedAt: new Date() } }
  );
  await Promise.all(eligibleRegistrations.map((registration) => notifyTeam(registration, {
    type: "application_status",
    title: `Application ${req.body.overallStatus.replace("_", " ")}`,
    message: `Your application status for ${event.title} was updated.`,
    link: `/event/${event._id}`,
  })));
  await writeAudit({ actorRole: "club", actorId: req.club._id, action: "application.bulk_update", targetType: "event", targetId: event._id, metadata: { count: result.modifiedCount, status: req.body.overallStatus } });
  return res.json({
    success: true,
    msg: `${result.modifiedCount} applications changed${eligibleIds.length < registrationIds.length ? `; ${registrationIds.length - eligibleIds.length} withdrawn or incomplete application(s) skipped` : ""}`,
    modifiedCount: result.modifiedCount,
    updatedIds: eligibleIds.map(String),
  });
};

function csvValue(value) {
  let text = value == null ? "" : String(value);
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

module.exports.exportApplications = async (req, res) => {
  const event = await ownedEvent(req.params.eventId, req.club._id);
  if (!event) return res.status(404).json({ success: false, msg: "Event not found" });
  const registrations = await registerationEventModel.find({ eventId: event._id }).populate("studentId").populate("membersAccepted");
  const rows = [["Team", "Captain", "Email", "Phone", "Branch", "Year", "Members", "Status", "Score", "Registered At"]];
  for (const registration of registrations) {
    rows.push([
      registration.teamName,
      registration.studentId?.name,
      registration.studentId?.email,
      registration.studentId?.phoneNumber,
      registration.studentId?.branch,
      registration.studentId?.year,
      (registration.membersAccepted || []).map((member) => member.name).join(", "),
      registration.overallStatus,
      registration.score,
      registration.registeredAt?.toISOString(),
    ]);
  }
  const csv = rows.map((row) => row.map(csvValue).join(",")).join("\n");
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", `attachment; filename="${String(event.title).replace(/[^a-z0-9_-]/gi, '_')}-applications.csv"`);
  return res.send(csv);
};

module.exports.getSessionAttendees = async (req, res) => {
  const session = await sessionModel.findOne({ _id: req.params.sessionId, clubId: req.club._id });
  if (!session) return res.status(404).json({ success: false, msg: "Session not found" });
  const attendees = await sessionRsvpModel.find({ sessionId: session._id }).populate("studentId", "name email branch year enrollmentNumber").sort({ createdAt: 1 });
  return res.json({ success: true, session, attendees });
};

module.exports.markAttendance = async (req, res) => {
  const session = await sessionModel.findOne({ _id: req.params.sessionId, clubId: req.club._id });
  if (!session) return res.status(404).json({ success: false, msg: "Session not found" });
  const studentId = req.body.studentId || (await studentModel.findOne({ email: normalizeEmail(req.body.studentEmail), status: "active" }).select("_id"))?._id;
  if (!studentId) return res.status(404).json({ success: false, msg: "Student not found" });
  let existing = await sessionRsvpModel.findOne({
    sessionId: session._id,
    studentId,
    status: { $in: ["confirmed", "attended", "absent"] },
  });
  if (!existing && req.body.status === "attended") {
    existing = await sessionRsvpModel.create({
      sessionId: session._id,
      studentId,
      status: "attended",
      source: "walk_in",
    });
    await writeAudit({ actorRole: "club", actorId: req.club._id, action: "session.walk_in", targetType: "session", targetId: session._id, metadata: { studentId } });
    return res.json({ success: true, msg: "Walk-in attendance recorded", rsvp: existing });
  }
  if (!existing) return res.status(404).json({ success: false, msg: "Student attendance record not found" });
  const wasCounted = ["confirmed", "attended"].includes(existing.status);
  const willBeCounted = req.body.status === "attended";
  existing.status = req.body.status;
  existing.updatedAt = new Date();
  const rsvp = await existing.save();
  if (wasCounted !== willBeCounted) {
    await sessionModel.updateOne(
      { _id: session._id, ...(willBeCounted ? {} : { confirmedRsvpCount: { $gt: 0 } }) },
      { $inc: { confirmedRsvpCount: willBeCounted ? 1 : -1 } }
    );
  }
  await writeAudit({ actorRole: "club", actorId: req.club._id, action: "session.attendance", targetType: "session", targetId: session._id, metadata: { studentId, status: req.body.status } });
  return res.json({ success: true, msg: "Attendance updated", rsvp });
};
