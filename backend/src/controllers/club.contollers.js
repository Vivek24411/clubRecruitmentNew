const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
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
const roundSubmissionModel = require("../models/roundSubmission.model");
const scheduleSlotModel = require("../models/scheduleSlot.model");
const scheduleReservationModel = require("../models/scheduleReservation.model");
const eventMembershipModel = require("../models/eventMembership.model");
const applicationHistoryModel = require("../models/applicationHistory.model");
const notificationModel = require("../models/notification.model");
const jobModel = require("../models/job.model");
const studentModel = require("../models/student.model");
const { clearSessionCookie, setSessionCookie } = require("../utils/auth");
const { notifyStudent, notifyTeam, notifyRegistrations } = require("../services/notification.services");
const { announcePublishedEvent, announcePublishedSession } = require("../services/publicationAnnouncement.services");
const { enqueueSessionReminder, enqueueSessionReminders } = require("../services/jobQueue.services");
const {
  allEventRounds: reminderEventRounds,
  enqueueSubmissionDeadlineRemindersForRound,
} = require("../services/roundReminder.services");
const { sessionsWithConfirmedRsvpCounts } = require("../services/sessionRsvp.services");
const { sessionEndAt } = require("../utils/sessionSchedule");
const { pageMetadata, pageRequest } = require("../utils/pagination");
const { sendOtp } = require("../services/student.services");
const { writeAudit } = require("../services/audit.services");
const { destroyCloudinaryAsset, destroyCloudinaryImage, destroyUploadedFile } = require("../utils/uploads");
const { normalizeProgrammeEligibility } = require("../services/academic.services");
const { invalidatePrincipal } = require("../services/authPrincipalCache.services");
const {
  ensureEventVerticals,
  eventVertical,
  normalizeVerticals,
  normalizeRounds,
} = require("../services/eventWorkflow.services");
const DUMMY_PASSWORD_HASH = "$2b$12$4Qj6z7mmoEgcnxHLS0xDR.jjYdMm05/mtrLZVBInMaqjKAuvz9taa";
const CLUB_PASSWORD_RESET_PURPOSE = "club_password_reset";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizeUserName = (userName) => String(userName || "").trim().toLowerCase();
const tokenHash = (token) => crypto.createHash("sha256").update(token).digest("hex");
const searchRegex = (value) => value ? new RegExp(String(value).trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;
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

function eventFormConfigurationError(verticals, eventDeadline) {
  for (const vertical of verticals || []) {
    const firstRound = vertical.rounds?.[0];
    if (firstRound?.type === "submission" && !(vertical.registrationDeadlineAt || eventDeadline)) {
      return `${vertical.title || "Application"} needs an application deadline`;
    }
    for (const round of vertical.rounds || []) {
      const invalidDropdown = (round.submissionFields || []).find((field) => field.type === "select" && (field.options || []).length < 2);
      if (invalidDropdown) return `Dropdown field "${invalidDropdown.label}" in ${round.title} needs at least two options`;
    }
  }
  return "";
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
  return res.json({ success: true, msg: "Club logged in successfully" });
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
    invalidatePrincipal("club", club._id);
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
    invalidatePrincipal("club", club._id);
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
    meetingUrl,
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
      meetingUrl,
      status: req.body.status || "published",
      capacity: req.body.capacity || null,
      sessionThumbnail: req.file?.path || "",
      sessionThumbnailPublicId: req.file?.filename || "",
    });

    await writeAudit({ actorRole: "club", actorId: req.club._id, action: "session.create", targetType: "session", targetId: session._id });
    if (session.status === "published") await announcePublishedSession(session);

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
  if (req.body.contactPersonsJSON !== undefined) {
    updateData.contactPersons = parsedArray(req.body.contactPersonsJSON).slice(0, 10).map((contact) => ({
      name: String(contact.name || "").trim().slice(0, 100),
      role: String(contact.role || "").trim().slice(0, 100),
      phone: String(contact.phone || "").trim().slice(0, 30),
    })).filter((contact) => contact.phone);
    // Keep the legacy field populated for older clients while structured contacts roll out.
    updateData.contactPhone = updateData.contactPersons[0]?.phone || "";
  }

  const oldLogoPublicId = req.club.clubLogoPublicId;
  const oldBannerPublicId = req.club.clubBannerPublicId;
  if (req.file) {
    updateData.clubLogo = req.file.path;
    updateData.clubLogoPublicId = req.file.filename;
  }
  if (req.clubBannerFile) {
    updateData.clubBanner = req.clubBannerFile.path;
    updateData.clubBannerPublicId = req.clubBannerFile.filename;
  }

  try {
    const club = await clubModel
      .findByIdAndUpdate(req.club._id, updateData, { new: true, runValidators: true })
      .select("-password");
    if (!club) {
      await Promise.all([req.file, req.clubBannerFile].filter(Boolean).map(destroyUploadedFile));
      return res.json({ success: false, msg: "Club not found" });
    }
    if (req.file && oldLogoPublicId && oldLogoPublicId !== req.file.filename) {
      await destroyCloudinaryImage(oldLogoPublicId);
    }
    if (req.clubBannerFile && oldBannerPublicId && oldBannerPublicId !== req.clubBannerFile.filename) {
      await destroyCloudinaryImage(oldBannerPublicId);
    }
    invalidatePrincipal("club", club._id);
    await writeAudit({ actorRole: "club", actorId: req.club._id, action: "profile.update", targetType: "club", targetId: req.club._id, metadata: { fields: Object.keys(updateData) } });
    return res.json({
      success: true,
      msg: "Profile updated successfully",
      club,
    });
  } catch (err) {
    await Promise.all([req.file, req.clubBannerFile].filter(Boolean).map(destroyUploadedFile));
    return res.status(400).json({ success: false, msg: err?.code === 11000 ? "Club name or username is already in use" : "Failed to update club profile" });
  }
};

module.exports.getSessions = async (req, res) => {
  try {
    const paging = pageRequest(req.query);
    const term = searchRegex(req.query.q);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    const filter = {
      clubId: req.club._id,
      ...(req.query.status && req.query.status !== "all" ? { status: req.query.status } : {}),
      ...(req.query.timing === "upcoming" ? { date: { $gte: today } } : req.query.timing === "past" ? { date: { $lt: today } } : {}),
      ...(term ? { $or: [{ title: term }, { shortDescription: term }, { venue: term }] } : {}),
    };
    const [sessions, total] = await Promise.all([
      sessionModel.find(filter).sort({ date: 1, time: 1, _id: 1 }).skip(paging.skip).limit(paging.limit),
      sessionModel.countDocuments(filter),
    ]);
    return res.json({ success: true, sessions: await sessionsWithConfirmedRsvpCounts(sessions), pagination: pageMetadata(paging, total) });
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
    const [sessionWithCount] = await sessionsWithConfirmedRsvpCounts([session]);
    return res.json({ success: true, session: sessionWithCount });
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
    problemStatementUrl,
  } = req.body;
  
  // Handle ContactInfo array properly
  let ContactInfo = parsedArray(req.body.contactInfoJSON || req.body.ContactInfo)
    .map((item) => String(item).trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 10);
  
  // Check if there are any ContactInfo fields in the request
  if (!ContactInfo.length && req.body['ContactInfo[0]'] !== undefined) {
    // Collect all ContactInfo items
    let i = 0;
    while (req.body[`ContactInfo[${i}]`] !== undefined) {
      if (i < 10 && String(req.body[`ContactInfo[${i}]`]).trim()) ContactInfo.push(String(req.body[`ContactInfo[${i}]`]).trim().slice(0, 200));
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
  const verticalsEnabled = req.body.verticalsEnabled === true || req.body.verticalsEnabled === "true";
  const requestedVerticals = normalizeVerticals(parsedArray(req.body.verticalsJSON), {
    registrationType: registrationType || "team",
    problemStatementUrl,
  });
  const eligibilityMode = req.body.eligibilityMode === "all_iitr" ? "all_iitr" : "undergraduate";
  const legacyYears = parsedArray(req.body.eligibilityYearsJSON)
    .map(Number).filter((year) => year >= 1 && year <= 5);
  const programmeEligibility = normalizeProgrammeEligibility(
    parsedArray(req.body.programmeEligibilityJSON),
    eligibilityMode,
    legacyYears,
  );

  const effectiveVerticals = requestedVerticals.length
    ? requestedVerticals
    : [{ title: title || "General", registrationDeadlineAt: null, rounds }];
  const formConfigurationError = eventFormConfigurationError(
    effectiveVerticals,
    registrationDeadlineAt || registerationDeadline,
  );
  if (formConfigurationError) {
    await destroyUploadedFile(req.file);
    return res.status(400).json({ success: false, msg: formConfigurationError });
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
      problemStatementUrl,
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
      // The model seeds a hidden default vertical from `rounds` when the club
      // is not using verticals.
      verticals: requestedVerticals.length ? requestedVerticals : [],
      verticalsEnabled: verticalsEnabled && requestedVerticals.length > 1,
      maxVerticalApplications: req.body.maxVerticalApplications
        ? Number(req.body.maxVerticalApplications)
        : 1,
      numberOfRounds: rounds.length,
      eligibilityMode,
      programmeEligibility,
      deadlineNotificationsEnabled: req.body.deadlineNotificationsEnabled !== "false",
    });

    await writeAudit({ actorRole: "club", actorId: req.club._id, action: "event.create", targetType: "event", targetId: event._id, metadata: { status: event.status } });
    if (event.status === "published") await announcePublishedEvent(event);

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
    const paging = pageRequest(req.query);
    const term = searchRegex(req.query.q);
    const filter = {
      clubId: req.club._id,
      ...(req.query.status && req.query.status !== "all" ? { status: req.query.status } : {}),
      ...(req.query.eventType && req.query.eventType !== "all" ? { eventType: req.query.eventType } : {}),
      ...(term ? { $or: [{ title: term }, { shortDescription: term }, { longDescription: term }] } : {}),
    };
    const [events, total] = await Promise.all([
      eventModel.find(filter).sort({ updatedAt: -1, _id: -1 }).skip(paging.skip).limit(paging.limit),
      eventModel.countDocuments(filter),
    ]);
    return res.json({ success: true, events, pagination: pageMetadata(paging, total) });
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
    await ensureEventVerticals(event);
   

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
    return res.json({ success: true, events, sessions: await sessionsWithConfirmedRsvpCounts(sessions) });
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    return res.json({ success: false, msg: "Failed to fetch dashboard data" });
  }
}

module.exports.updateEvent = async (req, res) => {
  const event = await ownedEvent(req.params.eventId, req.club._id);
  if (!event) {
    await destroyUploadedFile(req.file);
    return res.status(404).json({ success: false, msg: "Event not found" });
  }

  const previousDeadline = event.registrationDeadlineAt ? new Date(event.registrationDeadlineAt) : null;
  const allRounds = (target) => (target.verticals || []).flatMap((vertical) => vertical.rounds || []);
  const previousRoundDeadlines = new Map(allRounds(event).map((round) => [
    String(round._id),
    round.submissionDeadlineAt ? new Date(round.submissionDeadlineAt).toISOString() : "",
  ]));
  const allowedFields = [
    "title", "shortDescription", "longDescription", "problemStatementUrl", "eligibility", "ContactInfo",
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
  if (req.body.eligibilityMode !== undefined) {
    event.eligibilityMode = req.body.eligibilityMode === "all_iitr" ? "all_iitr" : "undergraduate";
  }
  if (req.body.programmeEligibilityJSON !== undefined || req.body.eligibilityMode !== undefined) {
    event.programmeEligibility = normalizeProgrammeEligibility(
      parsedArray(req.body.programmeEligibilityJSON, event.programmeEligibility),
      event.eligibilityMode,
      event.eligibilityYears,
    );
  }
  if (req.body.maxVerticalApplications !== undefined) {
    event.maxVerticalApplications = req.body.maxVerticalApplications
      ? Number(req.body.maxVerticalApplications)
      : null;
  }
  // Rounds arrive either as a flat list (no verticals) or nested inside
  // verticalsJSON. Either way they land on the vertical they belong to.
  if (req.body.verticalsJSON !== undefined || req.body.roundsJSON !== undefined) {
    const incoming = req.body.verticalsJSON !== undefined
      ? normalizeVerticals(parsedArray(req.body.verticalsJSON), { registrationType: event.registrationType })
      : [{
        ...(event.verticals?.[0]?.toObject ? event.verticals[0].toObject() : event.verticals?.[0] || {}),
        title: event.title || "General",
        registrationType: event.registrationType,
        minTeamSize: event.minTeamSize,
        maxTeamSize: event.maxTeamSize,
        maxParticipants: event.maxParticipants,
        problemStatementUrl: event.problemStatementUrl,
        rounds: normalizeRounds(parsedArray(req.body.roundsJSON)).map((round) => ({
          ...round,
          evaluationScope: (event.registrationType === "individual" || round.type === "test")
            ? "participant"
            : round.evaluationScope,
        })),
      }];

    const retainedVerticalIds = new Set(incoming.filter((vertical) => vertical._id).map((vertical) => String(vertical._id)));
    const formConfigurationError = eventFormConfigurationError(incoming, event.registrationDeadlineAt);
    if (formConfigurationError) {
      await destroyUploadedFile(req.file);
      return res.status(400).json({ success: false, msg: formConfigurationError });
    }
    const removedVerticals = (event.verticals || []).filter((vertical) => !retainedVerticalIds.has(String(vertical._id)));
    if (removedVerticals.length) {
      const blocked = await registerationEventModel.exists({
        eventId: event._id,
        verticalId: { $in: removedVerticals.map((vertical) => vertical._id) },
        overallStatus: { $ne: "withdrawn" },
      });
      if (blocked) {
        await destroyUploadedFile(req.file);
        return res.status(409).json({ success: false, msg: "A vertical with live applications cannot be removed. Close it instead" });
      }
    }

    const retainedRoundIds = new Set(incoming.flatMap((vertical) =>
      (vertical.rounds || []).filter((round) => round._id).map((round) => String(round._id))));
    const removedRoundIds = allRounds(event)
      .filter((round) => !retainedRoundIds.has(String(round._id)))
      .map((round) => round._id);
    if (removedRoundIds.length && await roundCandidateModel.exists({ eventId: event._id, roundId: { $in: removedRoundIds } })) {
      await destroyUploadedFile(req.file);
      return res.status(409).json({ success: false, msg: "A round with candidate activity cannot be removed. Keep it and edit its details instead" });
    }

    event.verticals = incoming;
    event.verticalsEnabled = req.body.verticalsEnabled !== undefined
      ? (req.body.verticalsEnabled === true || req.body.verticalsEnabled === "true") && incoming.length > 1
      : req.body.verticalsJSON !== undefined
        ? incoming.length > 1
        : event.verticalsEnabled;
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
  const changedRoundDeadlines = allRounds(event).filter((round) =>
    previousRoundDeadlines.has(String(round._id))
    && previousRoundDeadlines.get(String(round._id)) !== String(round.submissionDeadlineAt?.toISOString() || ""));
  const deadlineChanged = registrationDeadlineChanged || changedRoundDeadlines.length > 0;
  await Promise.all(changedRoundDeadlines.map((round) =>
    enqueueSubmissionDeadlineRemindersForRound(event, round, { reviveCompleted: true })));
  const notifyDeadlineChange = req.body.notifyRegistrants === true || req.body.notifyRegistrants === "true";
  if (deadlineChanged && notifyDeadlineChange) {
    const registrations = await registerationEventModel.find({ eventId: event._id, overallStatus: { $ne: "withdrawn" } });
    await notifyRegistrations(registrations, {
      type: "event_deadline_changed",
      title: `Deadline updated for ${event.title}`,
      message: registrationDeadlineChanged
        ? (event.registrationDeadlineAt
          ? `The registration deadline is now ${new Date(event.registrationDeadlineAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}.`
          : "The registration deadline was removed. Check the event page for current details.")
        : `${changedRoundDeadlines.map((round) => round.title).join(", ")} submission deadline was updated. Check the event page for the new timing.`,
      link: `/event/${event._id}`,
    });
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
  if (previousStatus !== "published" && event.status === "published") {
    await announcePublishedEvent(event);
    await Promise.all(reminderEventRounds(event).map((round) =>
      enqueueSubmissionDeadlineRemindersForRound(event, round, { reviveCompleted: true })));
  }
  if (previousStatus !== "cancelled" && event.status === "cancelled") {
    const registrations = await registerationEventModel.find({ eventId: event._id });
    await notifyRegistrations(registrations, {
      type: "event_cancelled",
      title: `${event.title} was cancelled`,
      message: "The club cancelled this recruitment event. Your application history remains available.",
      link: "/applications",
    });
  }
  await writeAudit({ actorRole: "club", actorId: req.club._id, action: `event.${event.status}`, targetType: "event", targetId: event._id });
  const statusLabel = event.status === "closed" ? "completed" : event.status;
  return res.json({ success: true, msg: `Event ${statusLabel}`, event });
};

module.exports.deleteEvent = async (req, res) => {
  const event = await ownedEvent(req.params.eventId, req.club._id);
  if (!event) return res.status(404).json({ success: false, msg: "Event not found" });
  if (String(req.body.confirmation || "") !== event.title) {
    return res.status(400).json({ success: false, msg: "Type the exact event title to confirm permanent deletion" });
  }

  // Stop new registrations before collecting and deleting the event graph. If
  // any later cleanup fails, the archived event remains available for retry.
  event.status = "archived";
  await event.save();

  const [submissions, slots, candidates] = await Promise.all([
    roundSubmissionModel.find({ eventId: event._id }).select("files").lean(),
    scheduleSlotModel.find({ eventId: event._id }).select("_id").lean(),
    roundCandidateModel.find({ eventId: event._id }).select("_id").lean(),
  ]);
  const slotIds = slots.map((slot) => slot._id);
  const candidateIds = candidates.map((candidate) => candidate._id);
  const eventLink = `/event/${event._id}`;
  let deleted = {};

  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      // Imported candidates in other events remain valid; only their origin
      // references are detached before source candidates are removed.
      if (candidateIds.length) {
        await roundCandidateModel.updateMany(
          { eventId: { $ne: event._id }, sourceCandidateId: { $in: candidateIds } },
          { $set: { sourceCandidateId: null } },
          { session: dbSession },
        );
        await roundCandidateModel.updateMany(
          { eventId: { $ne: event._id }, sourceCandidateIds: { $in: candidateIds } },
          { $pull: { sourceCandidateIds: { $in: candidateIds } } },
          { session: dbSession },
        );
      }
      await registerationEventModel.updateMany(
        { eventId: { $ne: event._id }, "source.eventId": event._id },
        { $set: { source: { type: "direct", eventId: null, roundId: null, registrationId: null } } },
        { session: dbSession },
      );

      // MongoDB transactions do not support parallel operations on one
      // session, so each collection is deliberately cleaned in sequence.
      const results = [];
      results.push(slotIds.length
        ? await scheduleReservationModel.deleteMany({ slotId: { $in: slotIds } }, { session: dbSession })
        : { deletedCount: 0 });
      results.push(await roundSubmissionModel.deleteMany({ eventId: event._id }, { session: dbSession }));
      results.push(await scheduleSlotModel.deleteMany({ eventId: event._id }, { session: dbSession }));
      results.push(await roundCandidateModel.deleteMany({ eventId: event._id }, { session: dbSession }));
      results.push(await eventMembershipModel.deleteMany({ eventId: event._id }, { session: dbSession }));
      results.push(await applicationHistoryModel.deleteMany({ eventId: event._id }, { session: dbSession }));
      results.push(await registerationEventModel.deleteMany({ eventId: event._id }, { session: dbSession }));
      results.push(await notificationModel.deleteMany({ link: eventLink }, { session: dbSession }));
      results.push(await jobModel.deleteMany({
        $or: [
          { "payload.notification.link": eventLink },
          { type: "round_reminder", "payload.eventId": { $in: [String(event._id), event._id] } },
        ],
      }, { session: dbSession }));
      deleted = {
        reservations: results[0].deletedCount,
        submissions: results[1].deletedCount,
        slots: results[2].deletedCount,
        candidates: results[3].deletedCount,
        memberships: results[4].deletedCount,
        histories: results[5].deletedCount,
        registrations: results[6].deletedCount,
        notifications: results[7].deletedCount,
        jobs: results[8].deletedCount,
      };
      const eventResult = await eventModel.deleteOne(
        { _id: event._id, clubId: req.club._id },
        { session: dbSession },
      );
      if (eventResult.deletedCount !== 1) throw new Error("Event disappeared during deletion");
    });
  } finally {
    await dbSession.endSession();
  }

  const submissionFiles = submissions.flatMap((submission) => submission.files || []);
  await Promise.all([
    destroyCloudinaryImage(event.eventBannerPublicId),
    ...submissionFiles.map((file) => destroyCloudinaryAsset(file.publicId, file.resourceType, file.deliveryType)),
  ]);
  await writeAudit({
    actorRole: "club",
    actorId: req.club._id,
    action: "event.delete_with_activity",
    targetType: "event",
    targetId: event._id,
    metadata: { title: event.title, deleted, uploadedFiles: submissionFiles.length },
  });
  return res.json({
    success: true,
    msg: "Event and all associated activity permanently deleted",
    deleted,
  });
};

module.exports.updateSession = async (req, res) => {
  const session = await sessionModel.findOne({ _id: req.params.sessionId, clubId: req.club._id });
  if (!session) {
    await destroyUploadedFile(req.file);
    return res.status(404).json({ success: false, msg: "Session not found" });
  }
  const previousStatus = session.status;
  const previousSchedule = { date: session.date, time: session.time, venue: session.venue, meetingUrl: session.meetingUrl };
  const previousThumbnailPublicId = session.sessionThumbnailPublicId;
  const capacityRequested = req.body.capacity !== undefined && req.body.capacity !== null && req.body.capacity !== "";
  if (session.capacity || capacityRequested) {
    session.confirmedRsvpCount = await sessionRsvpModel.countDocuments({
      sessionId: session._id,
      status: { $in: ["confirmed", "attended"] },
    });
  }
  const allowedFields = ["title", "shortDescription", "longDescription", "date", "time", "duration", "venue", "meetingUrl", "capacity", "status"];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      session[field] = field === "capacity" && (req.body[field] === "" || req.body[field] === null)
        ? null
        : req.body[field];
    }
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

  const endsAt = sessionEndAt(session);
  const canPromoteWaitlist = session.status === "published" && endsAt && endsAt > new Date();
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
  await Promise.all(promotedStudents.flatMap((studentId) => [
    notifyStudent(studentId, {
      type: "session_rsvp_promoted",
      title: `Your RSVP for ${session.title} is confirmed`,
      message: "The session capacity changed and a place is now available for you.",
      link: `/session/${session._id}`,
    }),
    enqueueSessionReminder(studentId, session),
  ]));
  if (previousStatus !== "cancelled" && session.status === "cancelled") {
    const activeRsvps = await sessionRsvpModel.find({ sessionId: session._id, status: { $in: ["confirmed", "waitlisted"] } });
    await Promise.all(activeRsvps.map((rsvp) => notifyStudent(rsvp.studentId, {
      type: "session_cancelled",
      title: `${session.title} was cancelled`,
      message: "The club cancelled this session.",
      link: "/sessions",
    })));
  }
  const scheduleChanged = ["date", "time", "venue", "meetingUrl"].some((field) => String(previousSchedule[field] || "") !== String(session[field] || ""));
  const becamePublished = previousStatus !== "published" && session.status === "published";
  if ((scheduleChanged && session.status !== "cancelled") || becamePublished) {
    const activeRsvps = await sessionRsvpModel.find({ sessionId: session._id, status: { $in: ["confirmed", "waitlisted"] } });
    if (scheduleChanged) {
      await Promise.all(activeRsvps.map((rsvp) => notifyStudent(rsvp.studentId, {
        type: "session_schedule_changed",
        title: `${session.title} schedule updated`,
        message: `The session is now scheduled for ${session.date} at ${session.time}${session.venue ? ` in ${session.venue}` : ""}.`,
        link: `/session/${session._id}`,
      })));
    }
    await enqueueSessionReminders(
      activeRsvps.filter((rsvp) => rsvp.status === "confirmed" && rsvp.source !== "walk_in").map((rsvp) => rsvp.studentId),
      session,
    );
  }
  if (becamePublished) await announcePublishedSession(session);
  await writeAudit({ actorRole: "club", actorId: req.club._id, action: "session.update", targetType: "session", targetId: session._id });
  const updatedSession = await sessionModel.findById(session._id);
  return res.json({ success: true, msg: promotedStudents.length ? `Session updated and ${promotedStudents.length} waitlisted RSVP(s) confirmed` : "Session updated successfully", session: updatedSession });
};

module.exports.deleteSession = async (req, res) => {
  const session = await sessionModel.findOne({ _id: req.params.sessionId, clubId: req.club._id });
  if (!session) return res.status(404).json({ success: false, msg: "Session not found" });
  if (String(req.body.confirmation || "") !== session.title) {
    return res.status(400).json({ success: false, msg: "Type the exact session title to confirm permanent deletion" });
  }

  // Stop new RSVPs before deleting the session graph. If a later cleanup
  // fails, the archived session remains available for another attempt.
  session.status = "archived";
  await session.save();

  const sessionLink = `/session/${session._id}`;
  let deleted = {};
  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      // Keep these operations sequential: MongoDB transactions do not support
      // parallel operations on one session.
      const rsvps = await sessionRsvpModel.deleteMany(
        { sessionId: session._id },
        { session: dbSession },
      );
      const notifications = await notificationModel.deleteMany(
        { link: sessionLink },
        { session: dbSession },
      );
      const jobs = await jobModel.deleteMany(
        {
          $or: [
            { type: "session_reminder", "payload.sessionId": { $in: [String(session._id), session._id] } },
            { "payload.notification.link": sessionLink },
          ],
        },
        { session: dbSession },
      );
      deleted = {
        rsvps: rsvps.deletedCount,
        notifications: notifications.deletedCount,
        jobs: jobs.deletedCount,
      };
      const sessionResult = await sessionModel.deleteOne(
        { _id: session._id, clubId: req.club._id },
        { session: dbSession },
      );
      if (sessionResult.deletedCount !== 1) throw new Error("Session disappeared during deletion");
    });
  } finally {
    await dbSession.endSession();
  }

  await destroyCloudinaryImage(session.sessionThumbnailPublicId);
  await writeAudit({
    actorRole: "club",
    actorId: req.club._id,
    action: "session.delete_with_activity",
    targetType: "session",
    targetId: session._id,
    metadata: { title: session.title, deleted },
  });
  return res.json({
    success: true,
    msg: "Session and all associated activity permanently deleted",
    deleted,
  });
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
  const vertical = eventVertical(event, req.query.verticalId);
  const registrations = await registerationEventModel
    .find({ eventId: event._id, ...(req.query.verticalId ? { verticalId: vertical?._id } : {}) })
    .populate("studentId").populate("membersAccepted");
  const verticalTitles = new Map((event.verticals || []).map((item) => [String(item._id), item.title]));
  const rows = [["Vertical", "Team", "Captain", "Email", "Phone", "Programme", "Branch / Discipline", "Year", "Members", "Status", "Score", "Registered At"]];
  for (const registration of registrations) {
    rows.push([
      verticalTitles.get(String(registration.verticalId)) || "",
      registration.teamName,
      registration.studentId?.name,
      registration.studentId?.email,
      registration.studentId?.phoneNumber,
      registration.studentId?.programme || "undergraduate",
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
  res.set("Content-Disposition", `attachment; filename="${String(event.title).replace(/[^a-z0-9_-]/gi, '_')}${vertical && req.query.verticalId ? `-${String(vertical.title).replace(/[^a-z0-9_-]/gi, '_')}` : ''}-applications.csv"`);
  return res.send(csv);
};

module.exports.getSessionAttendees = async (req, res) => {
  const session = await sessionModel.findOne({ _id: req.params.sessionId, clubId: req.club._id });
  if (!session) return res.status(404).json({ success: false, msg: "Session not found" });
  const attendees = await sessionRsvpModel.find({ sessionId: session._id }).populate("studentId", "name email programme branch year enrollmentNumber").sort({ createdAt: 1 });
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
