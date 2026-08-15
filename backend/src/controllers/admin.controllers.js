const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const clubModel = require("../models/club.model");
const sessionModel = require("../models/session.model");
const eventModel = require("../models/event.model");
const studentModel = require("../models/student.model");
const { clearSessionCookie, setSessionCookie, signSession } = require("../utils/auth");
const auditLogModel = require("../models/auditLog.model");
const platformSettingsModel = require("../models/platformSettings.model");
const registerationEventModel = require("../models/registerationEvent.model");
const sessionRsvpModel = require("../models/sessionRsvp.model");
const { writeAudit } = require("../services/audit.services");
const { notifyStudent, notifyTeam } = require("../services/notification.services");
const { destroyUploadedFile } = require("../utils/uploads");
const {
  YEAR_LABELS,
  inferProgramStartYear,
  normalizeProgramme,
  normalizedAcademicConfiguration,
  programmeDurationYears,
  PROGRAMME_DEFINITIONS,
} = require("../services/academic.services");
const {
  normalizeClubType,
  normalizedClubTypes,
} = require("../services/platformConfiguration.services");

function escapedRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports.login = async (req, res) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return res.status(400).json({ errors: error.array(), success: false });
  }

  const { email, password } = req.body;


  const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
  const emailMatches = email.trim().toLowerCase() === adminEmail;
  const passwordMatches = process.env.ADMIN_PASSWORD_HASH
    ? await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH)
    : password === process.env.ADMIN_PASSWORD;

  if (emailMatches && passwordMatches) {
    const token = signSession({ subject: adminEmail, role: "admin" });
    setSessionCookie(res, "admin", token);
    await writeAudit({ actorRole: "admin", actorId: adminEmail, action: "auth.login", targetType: "admin", targetId: adminEmail });
    return res.json({
      success: true,
      msg: "Admin logged in successfully",
      token,
    });
  } else {
    return res.json({ success: false, msg: "Invalid admin credentials" });
  }
};

module.exports.logout = async (req, res) => {
  clearSessionCookie(res, "admin");
  return res.json({ success: true, msg: "Logged out successfully" });
};

module.exports.getProfile = async (req, res) => {
  res.json({ success: true, profile: { email: req.admin.email } });
};

module.exports.addClub = async (req, res) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    await destroyUploadedFile(req.file);
    return res.status(400).json({ errors: error.array(), success: false, msg: "Please correct the club details" });
  }

  const { name, userName, password } = req.body;
  const category = normalizeClubType(req.body.category);
  const accountEmail = String(req.body.accountEmail || "").trim().toLowerCase();
  const contactEmail = req.body.useAccountEmailForContact === true || req.body.useAccountEmailForContact === "true"
    ? accountEmail
    : String(req.body.contactEmail || "").trim().toLowerCase();
  const clubLogo = req.file ? req.file.path : null;
  const clubLogoPublicId = req.file ? req.file.filename : null;

 


  try {
    const settings = await platformSettingsModel.findOne({ key: "global" });
    if (!normalizedClubTypes(settings).includes(category)) {
      await destroyUploadedFile(req.file);
      return res.status(400).json({ success: false, msg: "Choose a configured club type" });
    }
    const club = await clubModel.findOne({ userName: userName.trim().toLowerCase() });
    if (club) {
      await destroyUploadedFile(req.file);
      return res.status(409).json({ success: false, msg: "Club with this username already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const newClub = await clubModel.create({
      name: name.trim(),
      userName: userName.trim().toLowerCase(),
      password: hashedPassword,
      accountEmail,
      contactEmail,
      category,
      clubLogo,
      clubLogoPublicId,
    });
    await writeAudit({ actorRole: "admin", actorId: req.admin.email, action: "club.create", targetType: "club", targetId: newClub._id });
    return res.status(201).json({ success: true, msg: "Club added successfully", club: await clubModel.findById(newClub._id) });
  } catch (error) {
    await destroyUploadedFile(req.file);
    if (error?.code === 11000) return res.status(409).json({ success: false, msg: "Club name, username, or account email already exists" });
    throw error;
  }
};

module.exports.getAllSessions = async (req, res) => {
  try{
    const sessions = await sessionModel.find().populate('clubId', '-password');
    res.json({ success: true, sessions, msg: "Sessions fetched successfully" });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Error fetching sessions" });
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
    res.status(500).json({ success: false, msg: "Error fetching session details" });
  }
}

module.exports.getAllClubs = async (req, res) => {
  try {
    const clubs = await clubModel.find().select('-password');
    res.json({ success: true, clubs, msg: "Clubs fetched successfully" });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Error fetching clubs" });
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
    res.status(500).json({ success: false, msg: "Error fetching club details" });
  }
}

module.exports.getAllEvents = async (req, res) => {
  try {
    const events = await eventModel.find().populate('clubId', '-password');
    res.json({ success: true, events, msg: "Events fetched successfully" });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Error fetching events" });
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
    res.status(500).json({ success: false, msg: "Error fetching event details" });
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
    res.status(500).json({ success: false, msg: "Error fetching dashboard data" });
  }
}

module.exports.getStudents = async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
  const search = escapedRegex(String(req.query.search || "").trim());
  const filter = search
    ? { $or: ["name", "email", "enrollmentNumber"].map((field) => ({ [field]: { $regex: search, $options: "i" } })) }
    : {};
  const [students, total] = await Promise.all([
    studentModel.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
    studentModel.countDocuments(filter),
  ]);
  return res.json({ success: true, students, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
};

module.exports.updateStudentStatus = async (req, res) => {
  const student = await studentModel.findById(req.params.studentId).select("+tokenVersion");
  if (!student) return res.status(404).json({ success: false, msg: "Student not found" });
  student.status = req.body.status;
  student.tokenVersion += 1;
  await student.save();
  await writeAudit({ actorRole: "admin", actorId: req.admin.email, action: `student.${student.status}`, targetType: "student", targetId: student._id });
  const safeStudent = student.toObject();
  delete safeStudent.tokenVersion;
  return res.json({ success: true, msg: `Student ${student.status}`, student: safeStudent });
};

module.exports.updateStudentAcademics = async (req, res) => {
  const student = await studentModel.findById(req.params.studentId);
  if (!student) return res.status(404).json({ success: false, msg: "Student not found" });

  const settings = await platformSettingsModel.findOne({ key: "global" });
  const configuration = normalizedAcademicConfiguration(settings);
  const programme = normalizeProgramme(req.body.programme);
  const branch = configuration.branches.find((item) => item.name === req.body.branch);
  const branchName = String(req.body.branch || "").trim();
  const academicYear = Number(req.body.academicYear);
  if (programme === "undergraduate" && !branch) {
    return res.status(400).json({ success: false, msg: "Choose a branch from the configured branch list" });
  }
  const courseDurationYears = programmeDurationYears(programme, branchName, configuration, branch?.durationYears);
  if (academicYear > courseDurationYears) {
    return res.status(400).json({ success: false, msg: "The selected year is not valid for this course" });
  }

  student.programme = programme;
  student.branch = branchName;
  student.courseDurationYears = courseDurationYears;
  student.academicYear = academicYear;
  student.academicStatus = "studying";
  student.programStartYear = inferProgramStartYear(academicYear, new Date(), configuration);
  student.year = YEAR_LABELS[academicYear];
  await student.save();
  await writeAudit({
    actorRole: "admin",
    actorId: req.admin.email,
    action: "student.academics_update",
    targetType: "student",
    targetId: student._id,
    metadata: { programme, branch: student.branch, academicYear },
  });
  return res.json({ success: true, msg: "Student academics corrected", student });
};

module.exports.updateClubStatus = async (req, res) => {
  const club = await clubModel.findById(req.params.clubId).select("+tokenVersion");
  if (!club) return res.status(404).json({ success: false, msg: "Club not found" });
  club.status = req.body.status;
  club.tokenVersion += 1;
  await club.save();
  await writeAudit({ actorRole: "admin", actorId: req.admin.email, action: `club.${club.status}`, targetType: "club", targetId: club._id });
  const safeClub = club.toObject();
  delete safeClub.tokenVersion;
  return res.json({ success: true, msg: `Club ${club.status}`, club: safeClub });
};

module.exports.updateClubDetails = async (req, res) => {
  const club = await clubModel.findById(req.params.clubId);
  if (!club) return res.status(404).json({ success: false, msg: "Club not found" });
  if (req.body.category !== undefined) {
    const settings = await platformSettingsModel.findOne({ key: "global" });
    const category = normalizeClubType(req.body.category);
    if (!normalizedClubTypes(settings).includes(category)) {
      return res.status(400).json({ success: false, msg: "Choose a configured club type" });
    }
    req.body.category = category;
  }
  for (const field of ["category", "accountEmail", "contactEmail"]) {
    if (req.body[field] !== undefined) {
      club[field] = typeof req.body[field] === "string" ? req.body[field].trim().toLowerCase() : req.body[field];
    }
  }
  if (req.body.useAccountEmailForContact) club.contactEmail = club.accountEmail;
  try {
    await club.save();
  } catch (error) {
    return res.status(error?.code === 11000 ? 409 : 400).json({
      success: false,
      msg: error?.code === 11000 ? "That account email is already assigned to another club" : "Unable to update club details",
    });
  }
  await writeAudit({ actorRole: "admin", actorId: req.admin.email, action: "club.details_update", targetType: "club", targetId: club._id, metadata: { fields: Object.keys(req.body) } });
  return res.json({ success: true, msg: "Club details updated", club });
};

module.exports.resetClubPassword = async (req, res) => {
  const club = await clubModel.findById(req.params.clubId).select("+password +tokenVersion");
  if (!club) return res.status(404).json({ success: false, msg: "Club not found" });
  club.password = await bcrypt.hash(req.body.newPassword, 12);
  club.tokenVersion += 1;
  await club.save();
  await writeAudit({ actorRole: "admin", actorId: req.admin.email, action: "club.password_reset", targetType: "club", targetId: club._id });
  return res.json({ success: true, msg: "Club password reset; existing sessions were revoked" });
};

module.exports.moderateEvent = async (req, res) => {
  const previous = await eventModel.findById(req.params.eventId);
  const event = await eventModel.findByIdAndUpdate(
    req.params.eventId,
    { status: req.body.status, updatedAt: new Date() },
    { new: true, runValidators: true }
  );
  if (!event) return res.status(404).json({ success: false, msg: "Event not found" });
  if (previous?.status !== "cancelled" && event.status === "cancelled") {
    const registrations = await registerationEventModel.find({ eventId: event._id });
    await Promise.all(registrations.map((registration) => notifyTeam(registration, {
      type: "event_cancelled",
      title: `${event.title} was cancelled`,
      message: "An administrator cancelled this recruitment event. Your application history remains available.",
      link: "/applications",
    })));
  }
  await writeAudit({ actorRole: "admin", actorId: req.admin.email, action: `event.${event.status}`, targetType: "event", targetId: event._id });
  return res.json({ success: true, msg: `Event ${event.status}`, event });
};

module.exports.moderateSession = async (req, res) => {
  const previous = await sessionModel.findById(req.params.sessionId);
  const session = await sessionModel.findByIdAndUpdate(
    req.params.sessionId,
    { status: req.body.status, updatedAt: new Date() },
    { new: true, runValidators: true }
  );
  if (!session) return res.status(404).json({ success: false, msg: "Session not found" });
  if (previous?.status !== "cancelled" && session.status === "cancelled") {
    const activeRsvps = await sessionRsvpModel.find({ sessionId: session._id, status: { $in: ["confirmed", "waitlisted"] } });
    await Promise.all(activeRsvps.map((rsvp) => notifyStudent(rsvp.studentId, {
      type: "session_cancelled",
      title: `${session.title} was cancelled`,
      message: "An administrator cancelled this session.",
      link: "/sessions",
    })));
  }
  await writeAudit({ actorRole: "admin", actorId: req.admin.email, action: `session.${session.status}`, targetType: "session", targetId: session._id });
  return res.json({ success: true, msg: `Session ${session.status}`, session });
};

module.exports.getAuditLogs = async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const filter = req.query.action ? { action: { $regex: escapedRegex(req.query.action), $options: "i" } } : {};
  const [logs, total] = await Promise.all([
    auditLogModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    auditLogModel.countDocuments(filter),
  ]);
  return res.json({ success: true, logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
};

module.exports.getSettings = async (req, res) => {
  const settings = await platformSettingsModel.findOneAndUpdate(
    { key: "global" },
    { $setOnInsert: { key: "global" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return res.json({
    success: true,
    settings: {
      ...settings.toObject(),
      academicConfiguration: normalizedAcademicConfiguration(settings),
      clubTypes: normalizedClubTypes(settings),
      programmes: PROGRAMME_DEFINITIONS,
    },
  });
};

module.exports.updateSettings = async (req, res) => {
  const clubTypes = req.body.clubTypes === undefined ? undefined : normalizedClubTypes({ clubTypes: req.body.clubTypes });
  if (clubTypes) {
    const usedTypes = await clubModel.distinct("category");
    const missingType = usedTypes.find((type) => type && !clubTypes.includes(type));
    if (missingType) {
      return res.status(400).json({ success: false, msg: `The ${missingType} club type is still assigned to a club` });
    }
  }
  const update = {
    registrationEnabled: req.body.registrationEnabled,
    maintenanceMessage: req.body.maintenanceMessage,
    recruitmentCycle: req.body.recruitmentCycle,
    academicConfiguration: req.body.academicConfiguration,
    clubTypes,
    updatedAt: new Date(),
    updatedBy: req.admin.email,
  };
  Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);
  const settings = await platformSettingsModel.findOneAndUpdate(
    { key: "global" },
    { $set: update, $setOnInsert: { key: "global" } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  await writeAudit({ actorRole: "admin", actorId: req.admin.email, action: "settings.update", targetType: "platform", targetId: "global", metadata: update });
  return res.json({
    success: true,
    msg: "Recruitment settings updated",
    settings: {
      ...settings.toObject(),
      academicConfiguration: normalizedAcademicConfiguration(settings),
      clubTypes: normalizedClubTypes(settings),
      programmes: PROGRAMME_DEFINITIONS,
    },
  });
};
