const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const otpModel = require("../models/otp.model");
const verificationTokenModel = require("../models/verificationToken.model");
const { sendOtp, checkEmailDomain } = require("../services/student.services");
const studentModel = require("../models/student.model");
const sessionModel = require("../models/session.model");
const clubModel = require("../models/club.model");
const eventModel = require("../models/event.model");
const registerationEventModel = require("../models/registerationEvent.model");
const eventMembershipModel = require("../models/eventMembership.model");
const notificationModel = require("../models/notification.model");
const sessionRsvpModel = require("../models/sessionRsvp.model");
const { clearSessionCookie, setSessionCookie } = require("../utils/auth");
const { notifyStudent } = require("../services/notification.services");
const { enqueueSessionReminder } = require("../services/jobQueue.services");
const { sessionsWithConfirmedRsvpCounts } = require("../services/sessionRsvp.services");
const { sessionEndAt } = require("../utils/sessionSchedule");
const { writeAudit } = require("../services/audit.services");
const { destroyCloudinaryAsset, destroyCloudinaryImage, destroyUploadedFile } = require("../utils/uploads");
const applicationHistoryModel = require("../models/applicationHistory.model");
const roundCandidateModel = require("../models/roundCandidate.model");
const roundSubmissionModel = require("../models/roundSubmission.model");
const scheduleSlotModel = require("../models/scheduleSlot.model");
const scheduleReservationModel = require("../models/scheduleReservation.model");
const {
  eventEligibility,
  inferProgramStartYear,
  normalizeProgramme,
  normalizedAcademicConfiguration,
  parseAcademicYear,
  programmeDurationYears,
  PROGRAMME_DEFINITIONS,
  syncAcademicState,
  YEAR_LABELS,
} = require("../services/academic.services");
const { getPlatformSettingsCached } = require("../services/platformConfiguration.services");
const { invalidatePrincipal } = require("../services/authPrincipalCache.services");
const {
  candidateIncludesStudent,
  ensureEventVerticals,
  eventVertical,
  verticalRounds,
  verticalEligibilitySource,
  verticalDeadlineAt,
  initializeRegistrationWorkflow,
  registrationParticipantIds,
  removeParticipantFromRegistrationWorkflow,
  studentApplicationStatus,
  syncRegistrationParticipants,
  withdrawRegistrationWorkflow,
} = require("../services/eventWorkflow.services");

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const tokenHash = (token) => crypto.createHash("sha256").update(token).digest("hex");
const PUBLIC_CLUB_FIELDS = "name category shortDescription longDescription website linkedin instagram achivements recruitmentMethods contactEmail contactPhone clubLogo clubBanner resources annualEvents status";
const DUMMY_PASSWORD_HASH = "$2b$12$4Qj6z7mmoEgcnxHLS0xDR.jjYdMm05/mtrLZVBInMaqjKAuvz9taa";

function publicStudent(student) {
  if (!student) return null;
  const value = student.toObject ? student.toObject() : { ...student };
  delete value.password;
  delete value.tokenVersion;
  return value;
}

async function consumeVerificationToken({ email, purpose, token }) {
  if (!token) return null;
  return verificationTokenModel.findOneAndDelete({
    email: normalizeEmail(email),
    purpose,
    tokenHash: tokenHash(token),
    expiresAt: { $gt: new Date() },
  });
}

function registrationDeadline(event) {
  if (event.registrationDeadlineAt) return new Date(event.registrationDeadlineAt);
  if (!event.registerationDeadline) return null;
  return new Date(`${event.registerationDeadline}T23:59:59.999+05:30`);
}

function registrationIsOpen(event) {
  const deadline = registrationDeadline(event);
  return (!event.status || event.status === "published") && (!deadline || deadline > new Date());
}

function platformRegistrationIsOpen(settings, now = new Date()) {
  if (!settings) return true;
  const beforeCycle = settings.recruitmentCycle?.startAt && settings.recruitmentCycle.startAt > now;
  const afterCycle = settings.recruitmentCycle?.endAt && settings.recruitmentCycle.endAt < now;
  const cycleIsClosed = settings.recruitmentCycle?.status && settings.recruitmentCycle.status !== "open";
  return settings.registrationEnabled !== false && !cycleIsClosed && !beforeCycle && !afterCycle;
}

async function requireOpenRecruitment(res) {
  const settings = await getPlatformSettingsCached();
  if (platformRegistrationIsOpen(settings)) return true;
  res.status(403).json({ success: false, msg: "Recruitment registrations are currently closed" });
  return false;
}

async function requireActiveEventClub(event, res) {
  const activeClub = await clubModel.exists({ _id: event.clubId, status: "active" });
  if (activeClub) return true;
  res.status(404).json({ success: false, msg: "Event not found" });
  return false;
}

async function recordApplicationHistory({ studentId, registration, role, reason }) {
  try {
    await applicationHistoryModel.create({
      studentId,
      eventId: registration.eventId,
      verticalId: registration.verticalId || null,
      verticalTitle: registration.verticalTitle || "",
      registrationId: registration._id,
      captainId: registration.studentId,
      role,
      reason,
      teamName: registration.teamName,
      roundDetails: registration.roundDetails || [],
      currentRound: registration.currentRound || 0,
      numberOfRounds: registration.numberOfRounds || 0,
      registeredAt: registration.registeredAt,
    });
  } catch (error) {
    console.error("Application history write failed:", error?.message || "unknown error");
  }
}

async function registrationForStudent(registration, event, studentId) {
  if (!registration) return null;
  const workflowEvent = await ensureEventVerticals(event?._id ? event : await eventModel.findById(event));
  const candidates = await roundCandidateModel.find({
    registrationId: registration._id,
    status: { $ne: "revoked" },
  });
  return {
    ...registration.toObject(),
    studentOverallStatus: studentApplicationStatus(
      workflowEvent,
      candidates,
      studentId,
      registration.overallStatus,
      registration.verticalId,
    ),
  };
}

async function activeEventMembership(eventId, verticalId, studentId) {
  const membership = await eventMembershipModel.findOne({ eventId, verticalId, studentId });
  if (!membership) return null;
  const registration = await registerationEventModel.findById(membership.registrationId)
    .select("overallStatus");
  if (registration && registration.overallStatus !== "withdrawn") return membership;
  await membership.deleteOne();
  return null;
}

async function activeParticipantCount(eventId, verticalId) {
  const registrations = await registerationEventModel.find({
    eventId,
    verticalId,
    overallStatus: { $ne: "withdrawn" },
  }).select("studentId membersAccepted").lean();
  const participantIds = new Set();
  registrations.forEach((registration) => {
    if (registration.studentId) participantIds.add(String(registration.studentId));
    (registration.membersAccepted || []).forEach((studentId) => participantIds.add(String(studentId)));
  });
  return participantIds.size;
}

async function clearRegistrationWorkflow(registrationId) {
  const [submissions, slots] = await Promise.all([
    roundSubmissionModel.find({ registrationId }).select("files"),
    scheduleSlotModel.find({ registrationId }).select("_id"),
  ]);
  const slotIds = slots.map((slot) => slot._id);

  await Promise.all([
    ...submissions.flatMap((submission) => (submission.files || []).map((file) =>
      destroyCloudinaryAsset(file.publicId, file.resourceType))),
    slotIds.length
      ? scheduleReservationModel.deleteMany({ slotId: { $in: slotIds } })
      : Promise.resolve(),
  ]);
  await Promise.all([
    roundSubmissionModel.deleteMany({ registrationId }),
    scheduleSlotModel.deleteMany({ registrationId }),
    roundCandidateModel.deleteMany({ registrationId }),
  ]);
}

async function removeWithdrawnRegistrationRecords(filter) {
  const registrations = await registerationEventModel.find({
    ...filter,
    overallStatus: "withdrawn",
  }).select("_id");
  if (!registrations.length) return 0;
  const registrationIds = registrations.map((registration) => registration._id);
  for (const registrationId of registrationIds) {
    await clearRegistrationWorkflow(registrationId);
  }
  await eventMembershipModel.deleteMany({ registrationId: { $in: registrationIds } });
  const result = await registerationEventModel.deleteMany({
    _id: { $in: registrationIds },
    overallStatus: "withdrawn",
  });
  return result.deletedCount;
}

async function removeDetachedRegistrationRecords(filter) {
  const registrations = await registerationEventModel.find(filter).select("_id");
  if (!registrations.length) return { removed: 0, blocked: 0 };
  const registrationIds = registrations.map((registration) => registration._id);
  const attachedIds = new Set((await eventMembershipModel.find({
    registrationId: { $in: registrationIds },
  }).select("registrationId").lean()).map((membership) => String(membership.registrationId)));
  const removableIds = registrationIds.filter((registrationId) => !attachedIds.has(String(registrationId)));
  for (const registrationId of removableIds) {
    await clearRegistrationWorkflow(registrationId);
  }
  if (removableIds.length) {
    await registerationEventModel.deleteMany({ _id: { $in: removableIds } });
  }
  return { removed: removableIds.length, blocked: registrationIds.length - removableIds.length };
}

module.exports.sendOtp = async (req, res) => {
 try{
   const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({ errors: errors.array(), success: false });
  }

  const email = normalizeEmail(req.body.email);
  const purpose = req.body.purpose || "signup";

  const validEmailFormat = checkEmailDomain(email);
  if (!validEmailFormat) {
    return res.json({
      success: false,
      msg: "Please use a valid IITR institute email",
    });
  }

  if (purpose === "signup" && await studentModel.exists({ email })) {
    return res.status(409).json({
      success: false,
      msg: "A student account already exists for this email. Sign in instead.",
    });
  }

  const accountExists = purpose !== "password_reset" || await studentModel.exists({ email });

  const otp = crypto.randomInt(100000, 1000000).toString();


  const hashedOtp = await bcrypt.hash(otp, 10);

  if (!accountExists) {
    return res.json({ success: true, msg: "If the account exists, an OTP has been sent" });
  }

  await Promise.race([
    otpModel.findOneAndUpdate(
      { email, purpose },
      { otp: hashedOtp, attempts: 0, createdAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database operation timeout')), 10000)
    )
  ]);

  if (accountExists) {
    const delivery = await sendOtp(email, otp);
    console.info('OTP email accepted by Resend:', { emailId: delivery?.id || 'unknown', purpose });
  }

  return res.json({
    success: true,
    msg: purpose === "password_reset"
      ? "If the account exists, an OTP has been sent"
      : "OTP accepted for delivery. Check spam if it does not arrive shortly",
  });
  }catch(err){
    console.error('Error in sendOtp controller:', err);
    return res.json({ 
      success: false, 
      msg: err.message === 'Database operation timeout' ? 
        'Database connection timeout. Please try again.' : 
        "Unable to send OTP. Please try again."
    });
  }
};

module.exports.verifyOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({ errors: errors.array(), success: false });
  }

  const email = normalizeEmail(req.body.email);
  const { otp } = req.body;
  const purpose = req.body.purpose || "signup";

  if (purpose === "signup" && await studentModel.exists({ email })) {
    await otpModel.deleteOne({ email, purpose });
    return res.status(409).json({
      success: false,
      msg: "A student account already exists for this email. Sign in instead.",
    });
  }

  const otpRecord = await otpModel.findOne({
    email,
    purpose,
    createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) },
  });
  if (!otpRecord) {
    return res.json({ success: false, msg: "OTP not found" });
  }



  const isMatch = await bcrypt.compare(otp, otpRecord.otp);
  if (!isMatch) {
    otpRecord.attempts += 1;
    if (otpRecord.attempts >= 5) {
      await otpModel.deleteOne({ _id: otpRecord._id });
    } else {
      await otpRecord.save();
    }
    return res.json({ success: false, msg: "Invalid OTP" });
  }

  await otpModel.deleteOne({ _id: otpRecord._id });
  await verificationTokenModel.deleteMany({ email, purpose });
  const verificationToken = crypto.randomBytes(32).toString("base64url");
  await verificationTokenModel.create({
    email,
    purpose,
    tokenHash: tokenHash(verificationToken),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  return res.json({ success: true, msg: "OTP verified successfully", verificationToken });
};

module.exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({ errors: errors.array(), success: false });
    }

    const { name, password, phoneNumber, enrollmentNumber, verificationToken } = req.body;
    const programme = normalizeProgramme(req.body.programme);
    const branch = String(req.body.branch || "").trim();
    const email = normalizeEmail(req.body.email);

    if (!checkEmailDomain(email)) {
      return res.status(400).json({ success: false, msg: "Please use a valid IITR institute email" });
    }

    const existingStudent = await studentModel.findOne({ email });
    if (existingStudent) {
      return res.status(409).json({ success: false, msg: "A student account already exists for this email. Sign in instead." });
    }

    const existingPhoneNumber = await studentModel.findOne({ phoneNumber });
    if (existingPhoneNumber) {
      return res.json({ success: false, msg: "Phone number already exists" });
    }

    const existingEnrollment = await studentModel.findOne({ enrollmentNumber: enrollmentNumber.trim().toUpperCase() });
    if (existingEnrollment) return res.status(409).json({ success: false, msg: "Enrollment number already exists" });

    const verified = await consumeVerificationToken({ email, purpose: "signup", token: verificationToken });
    if (!verified) {
      return res.status(400).json({ success: false, msg: "Email verification expired or invalid" });
    }

    const settings = await getPlatformSettingsCached();
    const academicConfiguration = normalizedAcademicConfiguration(settings);
    const selectedYear = parseAcademicYear(req.body.academicYear || req.body.year);
    const configuredBranch = academicConfiguration.branches.find((item) => item.name === branch);
    if (programme === "undergraduate" && !configuredBranch) {
      return res.status(400).json({ success: false, msg: "Choose a branch from the available branch list" });
    }
    const courseDurationYears = programmeDurationYears(
      programme,
      branch,
      academicConfiguration,
      configuredBranch?.durationYears,
    );
    if (selectedYear > courseDurationYears) {
      return res.status(400).json({ success: false, msg: "The selected year is not valid for this course" });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const student = await studentModel.create({
      name,
      email,
      password: hashedPassword,
      programme,
      branch,
      year: YEAR_LABELS[selectedYear],
      academicYear: selectedYear,
      academicStatus: "studying",
      programStartYear: inferProgramStartYear(selectedYear, new Date(), academicConfiguration),
      courseDurationYears,
      phoneNumber,
      enrollmentNumber
    });

    const token = await student.createToken();
    setSessionCookie(res, "student", token);
    await writeAudit({ actorRole: "student", actorId: student._id, action: "account.create", targetType: "student", targetId: student._id });

    return res.status(201).json({
      success: true,
      msg: "Registration successful",
      token,
      student: publicStudent(student),
    });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ success: false, msg: "Email, phone number, or enrollment number already exists" });
    console.error(err);
    return res.status(500).json({ success: false, msg: "Unable to complete registration" });
  }
};

module.exports.login = async (req, res) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return res.json({ errors: error.array(), success: false });
  }

  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  const student = await studentModel.findOne({ email }).select("+password +tokenVersion");
  if (!student) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    return res.json({ success: false, msg: "Invalid email or password" });
  }

  const isMatch = await student.comparePassword(password);
  if (!isMatch) {
    return res.json({ success: false, msg: "Invalid email or password" });
  }
  if (student.status === "suspended") {
    return res.status(403).json({ success: false, msg: "Student account is suspended" });
  }

  const settings = await getPlatformSettingsCached();
  await syncAcademicState(student, settings);

  const token = await student.createToken();
  setSessionCookie(res, "student", token);
  await writeAudit({ actorRole: "student", actorId: student._id, action: "auth.login", targetType: "student", targetId: student._id });
  return res.json({
    success: true,
    msg: "Login successful",
    token,
    student: publicStudent(student),
  });
};

module.exports.getProfile = async (req, res) => {
  try {
    const student = req.student;
    if (!student) {
      return res.status(404).json({ success: false, msg: "Student not found" });
    }
    return res.json({ success: true, student: publicStudent(student) });
  } catch (error) {
    console.error("Error fetching student profile:", error);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

module.exports.logout = async (req, res) => {
  clearSessionCookie(res, "student");
  return res.json({ success: true, msg: "Logged out successfully" });
};

module.exports.updateProfile = async (req, res) => {
  const allowed = ["name", "phoneNumber", "notificationPreferences"];
  const update = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => allowed.includes(key))
  );
  if (req.body.notificationPreferencesJSON) {
    try {
      const preferences = JSON.parse(req.body.notificationPreferencesJSON);
      update.notificationPreferences = {
        email: preferences.email !== false,
        inApp: preferences.inApp !== false,
      };
    } catch {
      await destroyUploadedFile(req.file);
      return res.status(400).json({ success: false, msg: "Notification preferences are invalid" });
    }
  }

  try {
    const student = await studentModel.findById(req.student._id);
    if (!student) {
      await destroyUploadedFile(req.file);
      return res.status(404).json({ success: false, msg: "Student not found" });
    }
    const oldPicturePublicId = student.profilePicturePublicId;
    Object.assign(student, update);
    if (req.file) {
      student.profilePicture = req.file.path;
      student.profilePicturePublicId = req.file.filename;
    }
    await student.save();
    invalidatePrincipal("student", student._id);
    if (req.file && oldPicturePublicId && oldPicturePublicId !== req.file.filename) {
      await destroyCloudinaryImage(oldPicturePublicId);
    }
    await writeAudit({ actorRole: "student", actorId: req.student._id, action: "profile.update", targetType: "student", targetId: req.student._id, metadata: { fields: Object.keys(update) } });
    return res.json({ success: true, msg: "Profile updated successfully", student: publicStudent(student) });
  } catch (error) {
    await destroyUploadedFile(req.file);
    const duplicate = error?.code === 11000;
    return res.status(duplicate ? 409 : 400).json({
      success: false,
      msg: duplicate ? "Phone number is already in use" : "Unable to update profile",
    });
  }
};

module.exports.changePassword = async (req, res) => {
  const student = await studentModel.findById(req.student._id).select("+password +tokenVersion");
  const valid = student && await student.comparePassword(req.body.currentPassword);
  if (!valid) return res.status(400).json({ success: false, msg: "Current password is incorrect" });

  student.password = await bcrypt.hash(req.body.newPassword, 12);
  student.tokenVersion += 1;
  await student.save();
  invalidatePrincipal("student", student._id);
  await writeAudit({ actorRole: "student", actorId: student._id, action: "auth.password_change", targetType: "student", targetId: student._id });
  clearSessionCookie(res, "student");
  return res.json({ success: true, msg: "Password changed. Please sign in again." });
};

module.exports.getAllSessions = async (req, res) => {
  try {
    const sessions = await sessionModel.find({ status: "published" }).populate({ path: "clubId", match: { status: "active" }, select: PUBLIC_CLUB_FIELDS });
    const visibleSessions = sessions.filter((session) => session.clubId);
    return res.json({ success: true, sessions: await sessionsWithConfirmedRsvpCounts(visibleSessions) });
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
      .findOne({ _id: sessionId, status: "published" })
      .populate({ path: "clubId", match: { status: "active" }, select: PUBLIC_CLUB_FIELDS });
    if (!session || !session.clubId) {
      return res.json({ success: false, msg: "Session not found" });
    }
    const [sessionWithCount] = await sessionsWithConfirmedRsvpCounts([session]);
    return res.json({ success: true, session: sessionWithCount });
  } catch (error) {
    console.error("Error fetching session:", error);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

module.exports.getAllClubs = async (req, res) => {
  try {
    const clubs = await clubModel.find({ status: "active" }).select(PUBLIC_CLUB_FIELDS);
    return res.json({ success: true, clubs });
  } catch (error) {

    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

module.exports.getAcademicOptions = async (req, res) => {
  const settings = await getPlatformSettingsCached();
  const academicConfiguration = normalizedAcademicConfiguration(settings);
  return res.json({
    success: true,
    academicConfiguration,
    programmes: PROGRAMME_DEFINITIONS,
    years: Object.entries(YEAR_LABELS).map(([value, label]) => ({ value: Number(value), label })),
  });
};

module.exports.getClub = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({ errors: errors.array(), success: false });
  }

  const { clubId } = req.query;

  try {
    const club = await clubModel.findOne({ _id: clubId, status: "active" }).select(PUBLIC_CLUB_FIELDS);
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
    const events = await eventModel.find({ status: { $in: ["published", "closed"] } }).populate({ path: "clubId", match: { status: "active" }, select: PUBLIC_CLUB_FIELDS });
    const eventIds = events.map((event) => event._id);
    const memberships = req.student
      ? await eventMembershipModel.find({ studentId: req.student._id, eventId: { $in: eventIds } })
        .populate("registrationId", "overallStatus")
      : [];
    const applications = new Map();
    for (const membership of memberships) {
      const key = String(membership.eventId);
      if (!applications.has(key)) applications.set(key, []);
      applications.get(key).push({
        registrationId: membership.registrationId?._id || membership.registrationId,
        verticalId: membership.verticalId,
        role: membership.role,
        overallStatus: membership.registrationId?.overallStatus,
      });
    }
    return res.json({
      success: true,
      events: events.filter((event) => event.clubId).map((event) => {
        const mine = applications.get(String(event._id)) || [];
        return {
          ...event.toObject(),
          applications: mine,
          application: mine[0] || null,
        };
      }),
    });
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
    const [event, settings] = await Promise.all([
      eventModel
        .findOne({ _id: eventId, status: { $in: ["published", "closed"] } })
        .populate({ path: "clubId", match: { status: "active" }, select: PUBLIC_CLUB_FIELDS }),
      getPlatformSettingsCached(),
    ]);
    if (!event || !event.clubId) {
      return res.json({ success: false, msg: "Event not found" });
    }
    await ensureEventVerticals(event);
    const eligibility = req.student ? eventEligibility(event, req.student, settings) : null;
    return res.json({
      success: true,
      event,
      registrationOpen: platformRegistrationIsOpen(settings),
      eligibility,
    });
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
      .find({ clubId, status: "published" })
      .populate({ path: "clubId", match: { status: "active" }, select: PUBLIC_CLUB_FIELDS });
    return res.json({ success: true, events: events.filter((event) => event.clubId) });
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
      .find({ clubId, status: "published" })
      .populate({ path: "clubId", match: { status: "active" }, select: PUBLIC_CLUB_FIELDS });
    const visibleSessions = sessions.filter((session) => session.clubId);
    return res.json({ success: true, sessions: await sessionsWithConfirmedRsvpCounts(visibleSessions) });
  } catch (error) {
    
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

module.exports.getDashBoard = async (req, res, next) => {
  const [events, sessions, settings] = await Promise.all([
    eventModel.find({ status: "published" }).populate({ path: "clubId", match: { status: "active" }, select: PUBLIC_CLUB_FIELDS }),
    sessionModel.find({ status: "published" }).populate({ path: "clubId", match: { status: "active" }, select: PUBLIC_CLUB_FIELDS }),
    getPlatformSettingsCached(),
  ]);
  const openEvents = events.filter((event) => event.clubId && registrationIsOpen(event));
  const memberships = req.student
    ? await eventMembershipModel.find({
      studentId: req.student._id,
      eventId: { $in: openEvents.map((event) => event._id) },
    })
    : [];
  const applicationEventIds = new Set(memberships.map((membership) => String(membership.eventId)));
  const visibleSessions = sessions.filter((session) => session.clubId);
  return res.json({
    success: true,
    events: openEvents.map((event) => ({ ...event.toObject(), hasApplied: applicationEventIds.has(String(event._id)) })),
    sessions: await sessionsWithConfirmedRsvpCounts(visibleSessions),
    settings,
  });
};

module.exports.registerEvent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({ errors: errors.array(), success: false });
    }

    const { eventId, verticalId } = req.body;
    const studentId = req.student._id;

    const [event, settings] = await Promise.all([
      eventModel.findById(eventId),
      getPlatformSettingsCached(),
    ]);
    if (!event) {
      return res.json({ success: false, msg: "Event not found" });
    }
    await ensureEventVerticals(event);

    const vertical = eventVertical(event, verticalId);
    if (!vertical) {
      return res.status(404).json({ success: false, msg: "This vertical is no longer available" });
    }

    if (!platformRegistrationIsOpen(settings)) {
      return res.status(403).json({ success: false, msg: "Recruitment registrations are currently closed" });
    }

    if (!await requireActiveEventClub(event, res)) return;

    if (!registrationIsOpen(event)) {
      return res.status(400).json({ success: false, msg: "Registration is closed" });
    }
    if (vertical.status === "closed") {
      return res.status(400).json({ success: false, msg: `Applications to ${vertical.title} are closed` });
    }
    const verticalDeadline = verticalDeadlineAt(event, vertical);
    if (verticalDeadline && new Date(verticalDeadline) < new Date()) {
      return res.status(400).json({ success: false, msg: `The deadline for ${vertical.title} has passed` });
    }

    const eligibility = eventEligibility(verticalEligibilitySource(event, vertical), req.student, settings);
    if (!eligibility.eligible) {
      return res.status(403).json({ success: false, msg: eligibility.reason });
    }

    const existingMembership = await activeEventMembership(eventId, vertical._id, studentId);
    const acceptedElsewhere = await registerationEventModel.exists({
      eventId,
      verticalId: vertical._id,
      membersAccepted: studentId,
      overallStatus: { $ne: "withdrawn" },
    });
    if (existingMembership || acceptedElsewhere) {
      return res.status(409).json({ success: false, msg: `You already belong to a team in ${vertical.title}` });
    }

    const alreadyRegistered = await registerationEventModel.findOne({
      eventId,
      verticalId: vertical._id,
      studentId,
      overallStatus: { $ne: "withdrawn" },
    });
    if (alreadyRegistered) {
      return res.json({
        success: false,
        msg: `You have already applied to ${vertical.title}`,
      });
    }

    // How many other verticals of this event the student is already in.
    if (event.maxVerticalApplications != null) {
      const otherApplications = await eventMembershipModel.countDocuments({
        eventId,
        studentId,
        verticalId: { $ne: vertical._id },
      });
      if (otherApplications >= event.maxVerticalApplications) {
        return res.status(409).json({
          success: false,
          msg: event.maxVerticalApplications === 1
            ? "This event lets you apply to only one vertical"
            : `You can apply to at most ${event.maxVerticalApplications} verticals in this event`,
        });
      }
    }

    if (vertical.maxParticipants && await activeParticipantCount(eventId, vertical._id) >= vertical.maxParticipants) {
      return res.status(409).json({ success: false, msg: `${vertical.title} has reached its participant limit` });
    }

    const roundDetailsStudent = (event.roundDetails || []).map((round) => ({
      ...round,
      selected: false,
      status: "not_scheduled",
      roundDate: null,
      remarks: "",
    }));


    const resetAt = new Date();
    let reusedWithdrawnAttempt = true;
    let registeration = await registerationEventModel.findOneAndUpdate(
      { eventId, verticalId: vertical._id, studentId, overallStatus: "withdrawn" },
      {
        $set: {
          roundDetails: roundDetailsStudent,
          numberOfRounds: vertical.numberOfRounds,
          membersAccepted: [],
          membersOffered: [],
          teamName: null,
          overallStatus: "submitted",
          currentRound: 0,
          currentRoundId: null,
          reviewerNotes: "",
          score: null,
          source: { type: "direct", eventId: null, verticalId: null, roundId: null, registrationId: null },
          registeredAt: resetAt,
          updatedAt: resetAt,
        },
      },
      { new: true, sort: { updatedAt: -1 }, runValidators: true },
    );

    if (registeration) {
      try {
        await clearRegistrationWorkflow(registeration._id);
      } catch (error) {
        registeration.overallStatus = "withdrawn";
        await registeration.save();
        throw error;
      }
    } else {
      reusedWithdrawnAttempt = false;
      try {
        registeration = await registerationEventModel.create({
          eventId,
          verticalId: vertical._id,
          studentId,
          roundDetails: roundDetailsStudent,
          numberOfRounds: vertical.numberOfRounds,
        });
      } catch (error) {
        if (error?.code === 11000) {
          return res.status(409).json({ success: false, msg: "You already have an application for this event. Refresh and try again" });
        }
        throw error;
      }
    }

    try {
      await eventMembershipModel.create({
        eventId,
        verticalId: vertical._id,
        registrationId: registeration._id,
        studentId,
        role: "captain",
      });
    } catch (error) {
      if (reusedWithdrawnAttempt) {
        registeration.overallStatus = "withdrawn";
        await registeration.save();
      } else {
        await registerationEventModel.deleteOne({ _id: registeration._id });
      }
      if (error?.code === 11000) {
        return res.status(409).json({ success: false, msg: `You already belong to a team in ${vertical.title}` });
      }
      throw error;
    }

    // Pending invitations from other teams in this same vertical no longer apply.
    await registerationEventModel.updateMany(
      { eventId, verticalId: vertical._id, membersOffered: studentId },
      { $pull: { membersOffered: studentId } }
    );
    await initializeRegistrationWorkflow(event, registeration);
    await writeAudit({ actorRole: "student", actorId: studentId, action: "event.register", targetType: "event", targetId: eventId });

   

    return res.json({
      success: true,
      msg: "Registered successfully",
      registeration,
    });
  } catch (err) {
    console.error("Event registration failed:", err);
    return res.status(500).json({ success: false, msg: "Unable to register for this event" });
  }
};

// Every team action is keyed on the registration rather than on (event,
// student): a student can hold one application per vertical, so the old pair
// no longer identifies a single team.
async function teamContext(registrationId, studentId) {
  const registration = await registerationEventModel.findOne({
    _id: registrationId,
    overallStatus: { $ne: "withdrawn" },
  });
  if (!registration) return { error: "Application not found", status: 404 };
  const event = await ensureEventVerticals(await eventModel.findById(registration.eventId));
  if (!event) return { error: "Event not found", status: 404 };
  const vertical = eventVertical(event, registration.verticalId);
  if (!vertical) return { error: "This vertical is no longer available", status: 404 };
  return {
    registration,
    event,
    vertical,
    isCaptain: String(registration.studentId) === String(studentId),
    isMember: (registration.membersAccepted || []).some((id) => String(id) === String(studentId)),
  };
}

// Shared gate for every mutating team action.
async function teamGate(res, registrationId, studentId, { requireCaptain = false, closedMessage = "Registration is closed" } = {}) {
  const context = await teamContext(registrationId, studentId);
  if (context.error) {
    res.status(context.status).json({ success: false, msg: context.error });
    return null;
  }
  if (!registrationIsOpen(context.event)) {
    res.status(400).json({ success: false, msg: closedMessage });
    return null;
  }
  if (!await requireActiveEventClub(context.event, res)) return null;
  if (!await requireOpenRecruitment(res)) return null;
  if (requireCaptain && !context.isCaptain) {
    res.status(403).json({ success: false, msg: "Only the team captain can do this" });
    return null;
  }
  return context;
}

module.exports.getEventDetails = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({ errors: errors.array(), success: false });
  }

  const { eventId } = req.query;
  const studentId = req.student._id;

  const visibleEvent = await eventModel
    .findOne({ _id: eventId, status: { $in: ["published", "closed"] } })
    .populate({ path: "clubId", match: { status: "active" }, select: PUBLIC_CLUB_FIELDS });
  if (!visibleEvent || !visibleEvent.clubId) return res.status(404).json({ success: false, msg: "Event not found" });
  await ensureEventVerticals(visibleEvent);

  const settings = await getPlatformSettingsCached();
  const [ownRegistrations, offeredRegistrations] = await Promise.all([
    registerationEventModel
      .find({
        eventId,
        overallStatus: { $ne: "withdrawn" },
        $or: [{ studentId }, { membersAccepted: studentId }],
      })
      .populate("studentId", "name email profilePicture")
      .populate("membersAccepted", "name email profilePicture")
      .populate("membersOffered", "name email profilePicture"),
    registerationEventModel
      .find({ eventId, membersOffered: studentId, overallStatus: { $ne: "withdrawn" } })
      .populate("studentId", "name email profilePicture")
      .populate("membersAccepted", "name email profilePicture")
      .select("studentId verticalId teamName membersAccepted"),
  ]);

  const applicationCount = ownRegistrations.length;
  const capReached = visibleEvent.maxVerticalApplications != null
    && applicationCount >= visibleEvent.maxVerticalApplications;

  const verticals = [];
  for (const vertical of visibleEvent.verticals) {
    const own = ownRegistrations.find((registration) =>
      String(registration.verticalId) === String(vertical._id));
    const invitations = offeredRegistrations.filter((registration) =>
      String(registration.verticalId) === String(vertical._id));
    const eligibility = eventEligibility(verticalEligibilitySource(visibleEvent, vertical), req.student, settings);
    const deadlineAt = verticalDeadlineAt(visibleEvent, vertical);
    const closed = vertical.status === "closed" || (deadlineAt && new Date(deadlineAt) < new Date());

    // 1 = captain of a team here, 2 = accepted member, 3 = invited only, 0 = no application.
    const show = own
      ? (String(own.studentId?._id || own.studentId) === String(studentId) ? 1 : 2)
      : invitations.length ? 3 : 0;

    verticals.push({
      ...vertical.toObject(),
      deadlineAt,
      show,
      detail: own ? await registrationForStudent(own, visibleEvent, studentId) : null,
      invitations,
      eligible: eligibility.eligible,
      eligibilityReason: eligibility.reason,
      canApply: !own && !closed && eligibility.eligible && !capReached && registrationIsOpen(visibleEvent),
      blockedReason: own ? "" : closed
        ? `Applications to ${vertical.title} are closed`
        : !eligibility.eligible ? eligibility.reason
        : capReached ? (visibleEvent.maxVerticalApplications === 1
            ? "This event lets you apply to only one vertical"
            : `You can apply to at most ${visibleEvent.maxVerticalApplications} verticals in this event`)
        : "",
    });
  }

  const primary = verticals.find((vertical) => vertical.show > 0) || verticals[0];
  return res.json({
    success: true,
    event: visibleEvent,
    verticals,
    applicationCount,
    maxVerticalApplications: visibleEvent.maxVerticalApplications,
    // Flattened view of the first vertical, for clients that predate verticals.
    Show: primary?.show || 0,
    detail: primary?.show === 3
      ? primary.invitations
      : primary?.show
        ? { ...primary.detail, invitations: primary.invitations }
        : visibleEvent,
  });
};

module.exports.addMemberOffer = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.json({ errors: error.array(), success: false });
  }

  const { registrationId, memberEmail } = req.body;
  const captainId = req.student._id;

  try {
    const context = await teamGate(res, registrationId, captainId, { requireCaptain: true });
    if (!context) return;
    const { event, vertical, registration: captainRegisteration } = context;

    if (vertical.registrationType === "individual") {
      return res.status(400).json({ success: false, msg: `${vertical.title} is an individual track` });
    }

    const member = await studentModel.findOne({ email: normalizeEmail(memberEmail), status: "active" });
    if (!member) {
      return res.json({ success: false, msg: "Member not found" });
    }
    if (member._id.toString() === captainId.toString()) {
      return res.json({ success: false, msg: "You cannot offer yourself" });
    }
    const settings = await getPlatformSettingsCached();
    const memberEligibility = eventEligibility(verticalEligibilitySource(event, vertical), member, settings);
    if (!memberEligibility.eligible) {
      return res.status(400).json({ success: false, msg: `This student is not eligible: ${memberEligibility.reason}` });
    }

    const alreadyRegistered = await registerationEventModel.findOne({
      eventId: event._id,
      verticalId: vertical._id,
      studentId: member._id,
      overallStatus: { $ne: "withdrawn" },
    });
    if (alreadyRegistered?.membersAccepted?.length) {
      return res.json({
        success: false,
        msg: "This student is already captain of a team with accepted members",
      });
    }

    const memberMembership = await activeEventMembership(event._id, vertical._id, member._id);
    const isStandaloneCaptain = alreadyRegistered
      && memberMembership?.role === "captain"
      && String(memberMembership.registrationId) === String(alreadyRegistered._id);
    if (memberMembership && !isStandaloneCaptain) {
      return res.status(409).json({ success: false, msg: `Member already belongs to a team in ${vertical.title}` });
    }

    if ((captainRegisteration.membersAccepted || []).some((id) => String(id) === String(member._id))) {
      return res.json({ success: false, msg: "Member already accepted your offer" });
    }
    const alreadyAcceptedSomeoneElse = await registerationEventModel.findOne({
      eventId: event._id,
      verticalId: vertical._id,
      membersAccepted: { $in: [member._id] },
      overallStatus: { $ne: "withdrawn" },
    });
    if (alreadyAcceptedSomeoneElse) {
      return res.json({
        success: false,
        msg: `Member already accepted an offer from another captain in ${vertical.title}`,
      });
    }
    if ((captainRegisteration.membersOffered || []).some((id) => String(id) === String(member._id))) {
      return res.json({ success: false, msg: "Member already offered by you" });
    }

    const maxTeamSize = vertical.maxTeamSize || 1;
    if (captainRegisteration.membersAccepted.length + 1 >= maxTeamSize) {
      return res.status(400).json({ success: false, msg: "Team is already full" });
    }

    captainRegisteration.membersOffered.push(member._id);
    captainRegisteration.markModified("membersOffered");
    await captainRegisteration.save();

    await notifyStudent(member._id, {
      type: "team_invitation",
      title: `Invitation to ${event.title}`,
      message: `${req.student.name} invited you to join their team for ${vertical.title}.`,
      link: `/event/${event._id}`,
    });
    await writeAudit({ actorRole: "student", actorId: captainId, action: "team.invite", targetType: "student", targetId: member._id, metadata: { eventId: event._id, verticalId: vertical._id } });

    return res.json({ success: true, msg: "Member offered successfully" });
  } catch (err) {
    console.error("Team invitation failed:", err);
    return res.status(500).json({ success: false, msg: "Unable to send the team invitation" });
  }
};

module.exports.acceptMemberOffer = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.json({ errors: error.array(), success: false });
  }

  const { registrationId } = req.body;
  const memberId = req.student._id;

  try {
    const context = await teamContext(registrationId, memberId);
    if (context.error) return res.status(context.status).json({ success: false, msg: context.error });
    const { event, vertical, registration: captainRegisteration } = context;

    if (!registrationIsOpen(event)) {
      return res.status(400).json({ success: false, msg: "Registration is closed" });
    }
    if (!await requireActiveEventClub(event, res)) return;
    if (!await requireOpenRecruitment(res)) return;

    if (!(captainRegisteration.membersOffered || []).some((id) => String(id) === String(memberId))) {
      return res.json({ success: false, msg: "Invitation is no longer valid" });
    }

    const settings = await getPlatformSettingsCached();
    const invitationEligibility = eventEligibility(verticalEligibilitySource(event, vertical), req.student, settings);
    if (!invitationEligibility.eligible) {
      return res.status(403).json({ success: false, msg: invitationEligibility.reason });
    }

    const existingMembership = await activeEventMembership(event._id, vertical._id, memberId);
    const ownRegistration = await registerationEventModel.findOne({
      eventId: event._id,
      verticalId: vertical._id,
      studentId: memberId,
      overallStatus: { $ne: "withdrawn" },
    });
    const movingOwnApplication = Boolean(
      ownRegistration
      && String(ownRegistration._id) !== String(captainRegisteration._id)
      && !(ownRegistration.membersAccepted || []).length,
    );
    const ownCaptainMembership = !existingMembership || (
      existingMembership.role === "captain"
      && String(existingMembership.registrationId) === String(ownRegistration?._id)
    );
    const acceptedElsewhere = await registerationEventModel.exists({
      eventId: event._id,
      verticalId: vertical._id,
      membersAccepted: memberId,
      overallStatus: { $ne: "withdrawn" },
    });
    if ((existingMembership && (!movingOwnApplication || !ownCaptainMembership)) || acceptedElsewhere) {
      return res.status(409).json({ success: false, msg: `You already belong to a team in ${vertical.title}` });
    }

    // Joining a team in a new vertical still counts against the per-event cap.
    if (!ownRegistration && event.maxVerticalApplications != null) {
      const otherApplications = await eventMembershipModel.countDocuments({
        eventId: event._id,
        studentId: memberId,
        verticalId: { $ne: vertical._id },
      });
      if (otherApplications >= event.maxVerticalApplications) {
        return res.status(409).json({
          success: false,
          msg: event.maxVerticalApplications === 1
            ? "This event lets you apply to only one vertical"
            : `You can apply to at most ${event.maxVerticalApplications} verticals in this event`,
        });
      }
    }

    const maxTeamSize = vertical.maxTeamSize || 1;
    if (captainRegisteration.membersAccepted.length + 1 >= maxTeamSize) {
      return res.status(400).json({ success: false, msg: "This team is full" });
    }

    if (!movingOwnApplication && vertical.maxParticipants
      && await activeParticipantCount(event._id, vertical._id) >= vertical.maxParticipants) {
      return res.status(409).json({ success: false, msg: `${vertical.title} has reached its participant limit` });
    }

    try {
      if (movingOwnApplication && existingMembership) {
        const moved = await eventMembershipModel.findOneAndUpdate(
          { _id: existingMembership._id, registrationId: ownRegistration._id, role: "captain" },
          { registrationId: captainRegisteration._id, role: "member", joinedAt: new Date() },
          { new: true },
        );
        if (!moved) return res.status(409).json({ success: false, msg: "Your application changed. Refresh and try again" });
      } else {
        await eventMembershipModel.create({
          eventId: event._id,
          verticalId: vertical._id,
          registrationId: captainRegisteration._id,
          studentId: memberId,
          role: "member",
        });
      }
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({ success: false, msg: `You already belong to a team in ${vertical.title}` });
      }
      throw error;
    }

    const joinedRegistration = await registerationEventModel.findOneAndUpdate(
      {
        _id: captainRegisteration._id,
        membersOffered: memberId,
        $expr: {
          $lt: [
            { $size: { $ifNull: ["$membersAccepted", []] } },
            Math.max(maxTeamSize - 1, 0),
          ],
        },
      },
      { $addToSet: { membersAccepted: memberId }, $pull: { membersOffered: memberId } },
      { new: true }
    );
    if (!joinedRegistration) {
      if (movingOwnApplication && existingMembership) {
        await eventMembershipModel.updateOne(
          { _id: existingMembership._id, registrationId: captainRegisteration._id },
          { registrationId: ownRegistration._id, role: "captain", joinedAt: existingMembership.joinedAt },
        );
      } else {
        await eventMembershipModel.deleteOne({ eventId: event._id, verticalId: vertical._id, studentId: memberId });
      }
      return res.status(409).json({ success: false, msg: "This team became full or the invitation expired" });
    }

    if (movingOwnApplication) {
      await recordApplicationHistory({ studentId: memberId, registration: ownRegistration, role: "captain", reason: "withdrawn" });
      ownRegistration.overallStatus = "withdrawn";
      ownRegistration.membersOffered = [];
      await ownRegistration.save();
      await clearRegistrationWorkflow(ownRegistration._id);
    }

    await registerationEventModel.updateMany(
      { eventId: event._id, verticalId: vertical._id, _id: { $ne: captainRegisteration._id } },
      { $pull: { membersOffered: memberId } }
    );
    await syncRegistrationParticipants(event, joinedRegistration);
    await Promise.all(registrationParticipantIds(joinedRegistration).map((studentId) => notifyStudent(studentId, {
      type: "team_joined",
      title: "Team member joined",
      message: String(studentId) === String(memberId)
        ? `You joined the team for ${vertical.title} in ${event.title}.`
        : `${req.student.name} joined your team for ${vertical.title}.`,
      link: `/event/${event._id}`,
    })));
    await writeAudit({ actorRole: "student", actorId: memberId, action: "team.accept_invitation", targetType: "registration", targetId: joinedRegistration._id });

    return res.json({
      success: true,
      msg: movingOwnApplication
        ? "Invitation accepted. Your individual application was replaced by the team application."
        : "Invitation accepted successfully",
    });
  } catch (err) {
    console.error("Team invitation acceptance failed:", err);
    return res.status(500).json({ success: false, msg: "Unable to accept the team invitation" });
  }
};

module.exports.unregisteredAsCaptain = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.json({ errors: error.array(), success: false });
  }

  const captainId = req.student._id;

  try {
    const context = await teamContext(req.body.registrationId, captainId);
    if (context.error) return res.status(context.status).json({ success: false, msg: context.error });
    const { event, vertical, registration, isCaptain } = context;
    if (!registrationIsOpen(event)) {
      return res.status(400).json({ success: false, msg: "Withdrawals are closed after the registration deadline" });
    }
    if (!isCaptain) return res.status(403).json({ success: false, msg: "Only the team captain can withdraw this application" });

    const formerMembers = [...registration.membersAccepted];
    await Promise.all([
      recordApplicationHistory({ studentId: captainId, registration, role: "captain", reason: "withdrawn" }),
      ...formerMembers.map((studentId) => recordApplicationHistory({ studentId, registration, role: "member", reason: "withdrawn" })),
    ]);
    registration.overallStatus = "withdrawn";
    registration.membersAccepted = [];
    registration.membersOffered = [];
    await registration.save();
    await withdrawRegistrationWorkflow(registration._id);
    await eventMembershipModel.deleteMany({ registrationId: registration._id });
    await Promise.all(formerMembers.map((studentId) => notifyStudent(studentId, {
      type: "team_disbanded",
      title: `Team withdrawn from ${event.title}`,
      message: `The team captain withdrew your ${vertical.title} application.`,
      link: `/event/${event._id}`,
    })));
    await writeAudit({ actorRole: "student", actorId: captainId, action: "event.withdraw", targetType: "event", targetId: event._id, metadata: { verticalId: vertical._id } });

    return res.json({ success: true, msg: "Unregistered successfully" });
  } catch (err) {
    console.error("Event withdrawal failed:", err);
    return res.status(500).json({ success: false, msg: "Unable to withdraw the application" });
  }
}

module.exports.addTeamName = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.json({ errors: error.array(), success: false });
  }

  const { registrationId, teamName } = req.body;
  const captainId = req.student._id;

  try {
    const context = await teamGate(res, registrationId, captainId, { requireCaptain: true });
    if (!context) return;
    const { registration } = context;

    registration.teamName = teamName;
    registration.markModified("teamName");
    await registration.save();
    await writeAudit({ actorRole: "student", actorId: captainId, action: "team.rename", targetType: "registration", targetId: registration._id });

    return res.json({ success: true, msg: "Team name added successfully" });
  } catch (err) {
    console.error("Team name update failed:", err);
    return res.status(500).json({ success: false, msg: "Unable to update the team name" });
  }
};

module.exports.declineMemberOffer = async (req, res) => {
  const memberId = req.student._id;
  const registration = await registerationEventModel.findOneAndUpdate(
    { _id: req.body.registrationId, membersOffered: memberId, overallStatus: { $ne: "withdrawn" } },
    { $pull: { membersOffered: memberId } },
    { new: true }
  );
  if (!registration) return res.status(404).json({ success: false, msg: "Invitation not found" });
  await notifyStudent(registration.studentId, {
    type: "team_invitation_declined",
    title: "Team invitation declined",
    message: `${req.student.name} declined your team invitation.`,
    link: `/event/${registration.eventId}`,
  });
  return res.json({ success: true, msg: "Invitation declined" });
};

module.exports.cancelMemberOffer = async (req, res) => {
  const member = await studentModel.findOne({ email: normalizeEmail(req.body.memberEmail) });
  if (!member) return res.status(404).json({ success: false, msg: "Student not found" });
  const registration = await registerationEventModel.findOneAndUpdate(
    { _id: req.body.registrationId, studentId: req.student._id, membersOffered: member._id, overallStatus: { $ne: "withdrawn" } },
    { $pull: { membersOffered: member._id } },
    { new: true }
  );
  if (!registration) return res.status(404).json({ success: false, msg: "Pending invitation not found" });
  return res.json({ success: true, msg: "Invitation cancelled" });
};

module.exports.removeTeamMember = async (req, res) => {
  const context = await teamGate(res, req.body.registrationId, req.student._id, {
    requireCaptain: true,
    closedMessage: "Team changes are closed",
  });
  if (!context) return;
  const { event, vertical } = context;
  const registration = await registerationEventModel.findOneAndUpdate(
    { _id: context.registration._id, membersAccepted: req.body.memberId, overallStatus: { $ne: "withdrawn" } },
    { $pull: { membersAccepted: req.body.memberId } },
    { new: true }
  );
  if (!registration) return res.status(404).json({ success: false, msg: "Team member not found" });
  await recordApplicationHistory({ studentId: req.body.memberId, registration, role: "member", reason: "removed" });
  await removeParticipantFromRegistrationWorkflow(registration._id, req.body.memberId, "withdrawn");
  await eventMembershipModel.deleteOne({ registrationId: registration._id, studentId: req.body.memberId, role: "member" });
  await writeAudit({ actorRole: "student", actorId: req.student._id, action: "team.remove_member", targetType: "registration", targetId: registration._id, metadata: { memberId: req.body.memberId } });
  await notifyStudent(req.body.memberId, {
    type: "team_removed",
    title: "Removed from team",
    message: `The team captain removed you from the ${vertical.title} team.`,
    link: `/event/${event._id}`,
  });
  return res.json({ success: true, msg: "Team member removed" });
};

module.exports.leaveTeam = async (req, res) => {
  const context = await teamGate(res, req.body.registrationId, req.student._id, {
    closedMessage: "Team changes are closed",
  });
  if (!context) return;
  const { event } = context;
  const membership = await eventMembershipModel.findOne({
    registrationId: context.registration._id,
    studentId: req.student._id,
    role: "member",
  });
  if (!membership) return res.status(404).json({ success: false, msg: "Team membership not found" });
  const registration = await registerationEventModel.findByIdAndUpdate(
    membership.registrationId,
    { $pull: { membersAccepted: req.student._id } },
    { new: true }
  );
  if (registration) await recordApplicationHistory({ studentId: req.student._id, registration, role: "member", reason: "left" });
  if (registration) await removeParticipantFromRegistrationWorkflow(registration._id, req.student._id, "withdrawn");
  await membership.deleteOne();
  await writeAudit({ actorRole: "student", actorId: req.student._id, action: "team.leave", targetType: "registration", targetId: membership.registrationId });
  if (registration) {
    await notifyStudent(registration.studentId, {
      type: "team_member_left",
      title: "Team member left",
      message: `${req.student.name} left your event team.`,
      link: `/event/${event._id}`,
    });
  }
  return res.json({ success: true, msg: "You left the team" });
};

module.exports.transferCaptain = async (req, res) => {
  const oldCaptainId = req.student._id;
  const newCaptainId = req.body.memberId;
  const context = await teamGate(res, req.body.registrationId, oldCaptainId, {
    requireCaptain: true,
    closedMessage: "Captain changes are closed after the registration deadline",
  });
  if (!context) return;
  const { event, vertical, registration } = context;

  if (!(registration.membersAccepted || []).some((id) => String(id) === String(newCaptainId))) {
    return res.status(404).json({ success: false, msg: "Choose an active member of your team" });
  }

  const oldCaptainMembership = await eventMembershipModel.findOne({
    registrationId: registration._id,
    studentId: oldCaptainId,
    role: "captain",
  });
  const newCaptainMembership = await eventMembershipModel.findOne({
    registrationId: registration._id,
    studentId: newCaptainId,
    role: "member",
  });
  if (!oldCaptainMembership || !newCaptainMembership) {
    return res.status(409).json({ success: false, msg: "Team membership is out of date. Refresh and try again" });
  }

  await removeWithdrawnRegistrationRecords({
    eventId: event._id,
    verticalId: vertical._id,
    studentId: newCaptainId,
    _id: { $ne: registration._id },
  });
  const staleApplications = await removeDetachedRegistrationRecords({
    eventId: event._id,
    verticalId: vertical._id,
    studentId: newCaptainId,
    _id: { $ne: registration._id },
  });
  if (staleApplications.blocked) {
    return res.status(409).json({
      success: false,
      msg: "This member still has another active team record for this vertical. Ask them to leave that team first",
    });
  }

  registration.studentId = newCaptainId;
  registration.membersAccepted = registration.membersAccepted
    .filter((studentId) => String(studentId) !== String(newCaptainId));
  if (!registration.membersAccepted.some((studentId) => String(studentId) === String(oldCaptainId))) {
    registration.membersAccepted.push(oldCaptainId);
  }
  try {
    await registration.save();
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        msg: "A previous application is still blocking this captain change. Refresh and try once more",
      });
    }
    throw error;
  }
  try {
    oldCaptainMembership.role = "member";
    newCaptainMembership.role = "captain";
    await Promise.all([oldCaptainMembership.save(), newCaptainMembership.save()]);
  } catch (error) {
    registration.studentId = oldCaptainId;
    registration.membersAccepted = registration.membersAccepted
      .filter((studentId) => String(studentId) !== String(oldCaptainId));
    if (!registration.membersAccepted.some((studentId) => String(studentId) === String(newCaptainId))) {
      registration.membersAccepted.push(newCaptainId);
    }
    await registration.save();
    throw error;
  }

  await Promise.all([
    ...registrationParticipantIds(registration).map((studentId) => notifyStudent(studentId, {
      type: "team_captain_transfer",
      title: `Captain updated for ${event.title}`,
      message: String(studentId) === String(newCaptainId)
        ? `${req.student.name} transferred team captaincy to you.`
        : `Team captaincy was transferred to a different member. Open the event to view the updated team.`,
      link: `/event/${event._id}`,
    })),
    writeAudit({
      actorRole: "student",
      actorId: oldCaptainId,
      action: "team.transfer_captain",
      targetType: "registration",
      targetId: registration._id,
      metadata: { newCaptainId, verticalId: vertical._id },
    }),
  ]);
  return res.json({ success: true, msg: "Captaincy transferred successfully" });
};

module.exports.getMyApplications = async (req, res) => {
  const populateRegistration = { path: "registrationId", populate: [
      { path: "eventId", populate: { path: "clubId", select: "name clubLogo" } },
      { path: "studentId", select: "name email" },
      { path: "membersAccepted", select: "name email" },
    ] };
  const memberships = await eventMembershipModel
    .find({ studentId: req.student._id })
    .populate(populateRegistration)
    .sort({ joinedAt: -1 });

  const registrationIds = memberships
    .map((membership) => membership.registrationId?._id)
    .filter(Boolean);
  const [workflowCandidates, workflowSlots] = await Promise.all([
    roundCandidateModel.find({ registrationId: { $in: registrationIds }, status: { $ne: "revoked" } })
      .populate("studentId", "name email profilePicture")
      .populate("participantIds", "name email profilePicture")
      .sort({ createdAt: 1 }),
    scheduleSlotModel.find({ registrationId: { $in: registrationIds }, status: "scheduled" })
      .sort({ startAt: 1 }),
  ]);
  const candidatesByRegistration = new Map();
  const slotsByRegistration = new Map();
  for (const candidate of workflowCandidates) {
    const key = String(candidate.registrationId);
    if (!candidatesByRegistration.has(key)) candidatesByRegistration.set(key, []);
    candidatesByRegistration.get(key).push(candidate);
  }
  for (const slot of workflowSlots) {
    const key = String(slot.registrationId);
    if (!slotsByRegistration.has(key)) slotsByRegistration.set(key, []);
    slotsByRegistration.get(key).push(slot);
  }
  const activeApplications = memberships.map((membership) => {
    const value = membership.toObject();
    if (!value.registrationId) return value;
    const event = value.registrationId.eventId;
    const vertical = (event?.verticals || []).find((item) =>
      String(item._id) === String(value.registrationId.verticalId));
    value.verticalTitle = vertical?.title || "";
    value.verticalsEnabled = Boolean(event?.verticalsEnabled);
    const registrationId = String(value.registrationId?._id || "");
    const registrationCandidates = candidatesByRegistration.get(registrationId) || [];
    value.registrationId.workflow = {
      candidates: registrationCandidates.map((candidate) => ({
        ...candidate.toObject(),
        isMine: candidateIncludesStudent(candidate, req.student._id),
      })),
      slots: slotsByRegistration.get(registrationId) || [],
      studentOverallStatus: studentApplicationStatus(
        value.registrationId.eventId,
        registrationCandidates,
        req.student._id,
        value.registrationId.overallStatus,
        value.registrationId.verticalId,
      ),
    };
    return value;
  });

  const histories = await applicationHistoryModel
    .find({ studentId: req.student._id })
    .populate({ path: "eventId", populate: { path: "clubId", select: "name clubLogo" } })
    .populate("captainId", "name email")
    .sort({ createdAt: -1 });

  const historyRegistrationIds = new Set(histories.map((history) => String(history.registrationId)));
  const legacyWithdrawn = await registerationEventModel
    .find({ studentId: req.student._id, overallStatus: "withdrawn" })
    .populate({ path: "eventId", populate: { path: "clubId", select: "name clubLogo" } })
    .populate("studentId", "name email")
    .populate("membersAccepted", "name email")
    .sort({ updatedAt: -1 });

  const legacyHistory = legacyWithdrawn
    .filter((registration) => !historyRegistrationIds.has(String(registration._id)))
    .map((registration) => ({
    _id: `withdrawn-${registration._id}`,
    studentId: req.student._id,
    registrationId: registration,
    role: "captain",
    joinedAt: registration.registeredAt,
    history: true,
    reason: "withdrawn",
  }));

  const applicationHistory = histories.map((history) => ({
    _id: history._id,
    studentId: req.student._id,
    verticalTitle: history.verticalTitle || "",
    role: history.role,
    joinedAt: history.createdAt,
    history: true,
    reason: history.reason,
    registrationId: {
      _id: history.registrationId,
      eventId: history.eventId,
      verticalId: history.verticalId,
      studentId: history.captainId,
      membersAccepted: [],
      teamName: history.teamName,
      roundDetails: history.roundDetails,
      currentRound: history.currentRound,
      numberOfRounds: history.numberOfRounds,
      overallStatus: "withdrawn",
      registeredAt: history.registeredAt,
    },
  }));

  return res.json({ success: true, applications: [...activeApplications, ...applicationHistory, ...legacyHistory] });
};

module.exports.getNotifications = async (req, res) => {
  const notifications = await notificationModel.find({ studentId: req.student._id }).sort({ createdAt: -1 }).limit(100);
  const unreadCount = await notificationModel.countDocuments({ studentId: req.student._id, readAt: null });
  return res.json({ success: true, notifications, unreadCount });
};

module.exports.getUnreadNotificationCount = async (req, res) => {
  const unreadCount = await notificationModel.countDocuments({ studentId: req.student._id, readAt: null });
  return res.json({ success: true, unreadCount });
};

module.exports.markNotificationRead = async (req, res) => {
  const notification = await notificationModel.findOneAndUpdate(
    { _id: req.body.notificationId, studentId: req.student._id },
    { readAt: new Date() },
    { new: true }
  );
  if (!notification) return res.status(404).json({ success: false, msg: "Notification not found" });
  return res.json({ success: true, notification });
};

module.exports.markAllNotificationsRead = async (req, res) => {
  const result = await notificationModel.updateMany(
    { studentId: req.student._id, readAt: null },
    { $set: { readAt: new Date() } }
  );
  return res.json({ success: true, msg: "All notifications marked as read", modifiedCount: result.modifiedCount });
};

module.exports.rsvpSession = async (req, res) => {
  const session = await sessionModel.findById(req.body.sessionId);
  if (!session || session.status !== "published") {
    return res.status(404).json({ success: false, msg: "Session is not available" });
  }
  const activeClub = await clubModel.exists({ _id: session.clubId, status: "active" });
  if (!activeClub) return res.status(404).json({ success: false, msg: "Session is not available" });

  const endsAt = sessionEndAt(session);
  if (!endsAt) return res.status(400).json({ success: false, msg: "Session schedule is incomplete" });
  if (endsAt <= new Date()) return res.status(400).json({ success: false, msg: "Session has already ended" });

  const existing = await sessionRsvpModel.findOne({ sessionId: session._id, studentId: req.student._id });
  if (["confirmed", "attended"].includes(existing?.status)) {
    if (existing.status === "confirmed" && existing.source !== "walk_in") {
      await enqueueSessionReminder(req.student._id, session);
    }
    return res.json({ success: true, msg: "RSVP already confirmed", rsvp: existing });
  }

  let status = "confirmed";
  let reservedSlot = false;
  if (session.capacity) {
    if (session.confirmedRsvpCount == null) {
      const confirmedCount = await sessionRsvpModel.countDocuments({
        sessionId: session._id,
        status: { $in: ["confirmed", "attended"] },
      });
      await sessionModel.updateOne({ _id: session._id }, { $set: { confirmedRsvpCount: confirmedCount } });
    }
    const reservedSession = await sessionModel.findOneAndUpdate(
      {
        _id: session._id,
        status: "published",
        $expr: { $lt: [{ $ifNull: ["$confirmedRsvpCount", 0] }, "$capacity"] },
      },
      { $inc: { confirmedRsvpCount: 1 } },
      { new: true }
    );
    reservedSlot = Boolean(reservedSession);
    if (!reservedSlot) status = "waitlisted";
  } else {
    // Unlimited sessions do not need a contended counter update.
    reservedSlot = true;
  }

  let rsvp;
  try {
    rsvp = await sessionRsvpModel.findOneAndUpdate(
      { sessionId: session._id, studentId: req.student._id },
      { status, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (reservedSlot && session.capacity) {
      await sessionModel.updateOne({ _id: session._id, confirmedRsvpCount: { $gt: 0 } }, { $inc: { confirmedRsvpCount: -1 } });
    }
    throw error;
  }
  if (status === "confirmed") await enqueueSessionReminder(req.student._id, session);
  await writeAudit({ actorRole: "student", actorId: req.student._id, action: `session.rsvp_${status}`, targetType: "session", targetId: session._id });
  return res.json({ success: true, msg: status === "confirmed" ? "RSVP confirmed" : "Added to waitlist", rsvp });
};

module.exports.cancelSessionRsvp = async (req, res) => {
  const session = await sessionModel.findById(req.body.sessionId)
    .select("capacity title date time duration venue status");
  const endsAt = sessionEndAt(session);
  if (!session || !endsAt || endsAt <= new Date()) {
    return res.status(400).json({ success: false, msg: "Session has already ended" });
  }
  const rsvp = await sessionRsvpModel.findOneAndUpdate(
    { sessionId: req.body.sessionId, studentId: req.student._id, status: { $in: ["confirmed", "waitlisted"] } },
    { status: "cancelled", updatedAt: new Date() },
    { new: false }
  );
  if (!rsvp) return res.status(404).json({ success: false, msg: "Active RSVP not found" });
  if (rsvp.status === "confirmed") {
    const limitedSession = session.capacity != null ? session : null;
    if (limitedSession) {
      await sessionModel.updateOne({ _id: rsvp.sessionId, confirmedRsvpCount: { $gt: 0 } }, { $inc: { confirmedRsvpCount: -1 } });
      const promoted = await sessionRsvpModel.findOneAndUpdate(
        { sessionId: rsvp.sessionId, status: "waitlisted" },
        { status: "confirmed", updatedAt: new Date() },
        { new: true, sort: { createdAt: 1 } }
      );
      if (promoted) {
        await sessionModel.updateOne({ _id: rsvp.sessionId }, { $inc: { confirmedRsvpCount: 1 } });
        await Promise.all([
          notifyStudent(promoted.studentId, {
            type: "session_rsvp_promoted",
            title: "Your RSVP is confirmed",
            message: "A place opened up and you have been moved from the waitlist.",
            link: `/session/${rsvp.sessionId}`,
          }),
          enqueueSessionReminder(promoted.studentId, limitedSession),
        ]);
      }
    }
  }
  await writeAudit({ actorRole: "student", actorId: req.student._id, action: "session.rsvp_cancel", targetType: "session", targetId: rsvp.sessionId });
  return res.json({ success: true, msg: "RSVP cancelled", rsvp: { ...rsvp.toObject(), status: "cancelled" } });
};

module.exports.getSessionRsvp = async (req, res) => {
  const rsvp = await sessionRsvpModel.findOne({ sessionId: req.query.sessionId, studentId: req.student._id });
  return res.json({ success: true, rsvp });
};


module.exports.forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({ errors: errors.array(), success: false });
  }

  const email = normalizeEmail(req.body.email);
  const { newPassword, resetToken } = req.body;

  try {
    const verified = await consumeVerificationToken({ email, purpose: "password_reset", token: resetToken });
    if (!verified) {
      return res.status(400).json({ success: false, msg: "Reset verification expired or invalid" });
    }

    const student = await studentModel.findOne({ email }).select("+password +tokenVersion");
    if (!student) {
      return res.json({ success: true, msg: "Password reset request processed" });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    student.password = hashedPassword;
    student.tokenVersion += 1;
    student.markModified("password");
    await student.save();
    invalidatePrincipal("student", student._id);
    await writeAudit({ actorRole: "student", actorId: student._id, action: "auth.password_reset", targetType: "student", targetId: student._id });

    clearSessionCookie(res, "student");
    return res.json({ success: true, msg: "Password updated successfully" });
  } catch (err) {
    console.error("Password reset failed:", err);
    return res.status(500).json({ success: false, msg: "Unable to reset password" });
  }
};
