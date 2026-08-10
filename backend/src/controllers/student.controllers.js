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
const { writeAudit } = require("../services/audit.services");
const platformSettingsModel = require("../models/platformSettings.model");
const applicationHistoryModel = require("../models/applicationHistory.model");

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const tokenHash = (token) => crypto.createHash("sha256").update(token).digest("hex");
const PUBLIC_CLUB_FIELDS = "name shortDescription longDescription website linkedin instagram achivements recruitmentMethods contactEmail contactPhone clubLogo status";
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
  const settings = await platformSettingsModel.findOne({ key: "global" });
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

    const { name, password, branch, year, phoneNumber, enrollmentNumber, verificationToken } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!checkEmailDomain(email)) {
      return res.status(400).json({ success: false, msg: "Please use a valid IITR institute email" });
    }

    const existingStudent = await studentModel.findOne({ email });
    if (existingStudent) {
      return res.json({ success: false, msg: "Student already exists" });
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

    const hashedPassword = await bcrypt.hash(password, 12);
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
  const allowed = ["name", "branch", "year", "phoneNumber", "notificationPreferences"];
  const update = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => allowed.includes(key))
  );

  try {
    const student = await studentModel.findByIdAndUpdate(req.student._id, update, {
      new: true,
      runValidators: true,
    });
    await writeAudit({ actorRole: "student", actorId: req.student._id, action: "profile.update", targetType: "student", targetId: req.student._id, metadata: { fields: Object.keys(update) } });
    return res.json({ success: true, msg: "Profile updated successfully", student: publicStudent(student) });
  } catch (error) {
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
  await writeAudit({ actorRole: "student", actorId: student._id, action: "auth.password_change", targetType: "student", targetId: student._id });
  clearSessionCookie(res, "student");
  return res.json({ success: true, msg: "Password changed. Please sign in again." });
};

module.exports.getAllSessions = async (req, res) => {
  try {
    const sessions = await sessionModel.find({ status: "published" }).populate({ path: "clubId", match: { status: "active" }, select: PUBLIC_CLUB_FIELDS });
    return res.json({ success: true, sessions: sessions.filter((session) => session.clubId) });
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
    return res.json({ success: true, session });
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
    const events = await eventModel.find({ status: "published" }).populate({ path: "clubId", match: { status: "active" }, select: PUBLIC_CLUB_FIELDS });
    return res.json({ success: true, events: events.filter((event) => event.clubId) });
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
      platformSettingsModel.findOne({ key: "global" }),
    ]);
    if (!event || !event.clubId) {
      return res.json({ success: false, msg: "Event not found" });
    }
    return res.json({ success: true, event, registrationOpen: platformRegistrationIsOpen(settings) });
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
    return res.json({ success: true, sessions: sessions.filter((session) => session.clubId) });
  } catch (error) {
    
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

module.exports.getDashBoard = async (req, res, next) => {
  const [events, sessions, settings] = await Promise.all([
    eventModel.find({ status: "published" }).populate({ path: "clubId", match: { status: "active" }, select: PUBLIC_CLUB_FIELDS }),
    sessionModel.find({ status: "published" }).populate({ path: "clubId", match: { status: "active" }, select: PUBLIC_CLUB_FIELDS }),
    platformSettingsModel.findOne({ key: "global" }).select("registrationEnabled maintenanceMessage recruitmentCycle"),
  ]);
  return res.json({ success: true, events: events.filter((event) => event.clubId), sessions: sessions.filter((session) => session.clubId), settings });
};

module.exports.registerEvent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({ errors: errors.array(), success: false });
    }

    const { eventId } = req.body;
    const studentId = req.student._id;

    const [event, settings] = await Promise.all([
      eventModel.findById(eventId),
      platformSettingsModel.findOne({ key: "global" }),
    ]);
    if (!event) {
      return res.json({ success: false, msg: "Event not found" });
    }

    if (!platformRegistrationIsOpen(settings)) {
      return res.status(403).json({ success: false, msg: "Recruitment registrations are currently closed" });
    }

    if (!await requireActiveEventClub(event, res)) return;

    if (!registrationIsOpen(event)) {
      return res.status(400).json({ success: false, msg: "Registration is closed" });
    }

    const existingMembership = await eventMembershipModel.findOne({ eventId, studentId });
    const acceptedElsewhere = await registerationEventModel.exists({ eventId, membersAccepted: studentId });
    if (existingMembership || acceptedElsewhere) {
      return res.status(409).json({ success: false, msg: "You already belong to a team for this event" });
    }

    const alreadyRegistered = await registerationEventModel.findOne({
      eventId,
      studentId,
    });
    if (alreadyRegistered && alreadyRegistered.overallStatus !== "withdrawn") {
      return res.json({
        success: false,
        msg: "Already registered for this event",
      });
    }

    const roundDetailsStudent = (event.roundDetails || []).map((round) => ({
      ...round,
      selected: false,
      status: "not_scheduled",
      roundDate: null,
      remarks: "",
    }));


    const registeration = alreadyRegistered || await registerationEventModel.create({
        eventId,
        studentId,
        roundDetails: roundDetailsStudent,
        numberOfRounds: event.numberOfRounds,
      });

    try {
      await eventMembershipModel.create({
        eventId,
        registrationId: registeration._id,
        studentId,
        role: "captain",
      });
    } catch (error) {
      if (!alreadyRegistered) await registerationEventModel.deleteOne({ _id: registeration._id });
      if (error?.code === 11000) {
        return res.status(409).json({ success: false, msg: "You already belong to a team for this event" });
      }
      throw error;
    }

    if (alreadyRegistered) {
      try {
        Object.assign(registeration, {
          roundDetails: roundDetailsStudent,
          numberOfRounds: event.numberOfRounds,
          membersAccepted: [],
          membersOffered: [],
          teamName: null,
          overallStatus: "submitted",
          currentRound: 0,
          reviewerNotes: "",
          score: null,
          registeredAt: new Date(),
        });
        await registeration.save();
      } catch (error) {
        await eventMembershipModel.deleteOne({ eventId, studentId });
        throw error;
      }
    }

    await registerationEventModel.updateMany(
      { eventId, membersOffered: studentId },
      { $pull: { membersOffered: studentId } }
    );
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
      overallStatus: { $ne: "withdrawn" },
    })
    .populate("eventId")
    .populate("studentId", "name email")
    .populate("membersAccepted", "name email")
    .populate("membersOffered", "name email");

  if (captainExists) {
    return res.json({ success: true, detail: captainExists, Show: 1 });
  }

  const memberAccepted = await registerationEventModel
    .findOne({
      eventId,
      membersAccepted: studentId, //{ $in: [studentId] }, thsi could be sued id we want to pass mutliple sutdentids and documents conatisn atlease one stidentdi
    })
    .populate("eventId")
    .populate("studentId", "name email")
    .populate("membersAccepted", "name email");

  if (memberAccepted) {
    return res.json({ success: true, detail: memberAccepted, Show: 2 });
  }

  const memberOffered = await registerationEventModel
    .find({
      eventId,
      membersOffered: studentId, //{ $in: [studentId] }, thsi could be sued id we want to pass mutliple sutdentids and documents conatisn atlease one stidentdi
    })
    .populate("eventId")
    .populate("studentId", "name email")
    .populate("membersAccepted", "name email");

  if (memberOffered && memberOffered.length > 0) {
    return res.json({ success: true, detail: memberOffered, Show: 3 });
  }

  const visibleEvent = await eventModel
    .findOne({ _id: eventId, status: { $in: ["published", "closed"] } })
    .populate({ path: "clubId", match: { status: "active" }, select: PUBLIC_CLUB_FIELDS });
  if (!visibleEvent || !visibleEvent.clubId) return res.status(404).json({ success: false, msg: "Event not found" });
  return res.json({ success: true, Show: 0, detail: visibleEvent });
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

    if (!registrationIsOpen(event)) {
      return res.status(400).json({ success: false, msg: "Registration is closed" });
    }
    if (!await requireActiveEventClub(event, res)) return;
    if (!await requireOpenRecruitment(res)) return;
    if (event.registrationType === "individual") {
      return res.status(400).json({ success: false, msg: "This is an individual event" });
    }

    const member = await studentModel.findOne({ email: normalizeEmail(memberEmail), status: "active" });
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

    const memberMembership = await eventMembershipModel.findOne({ eventId, studentId: member._id });
    if (memberMembership) {
      return res.status(409).json({ success: false, msg: "Member already belongs to a team for this event" });
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

    if (!captainRegisteration) {
      return res.status(404).json({ success: false, msg: "Register as a captain before inviting members" });
    }

    const maxTeamSize = event.maxTeamSize || event.maxParticipants || 1;
    if (captainRegisteration.membersAccepted.length + 1 >= maxTeamSize) {
      return res.status(400).json({ success: false, msg: "Team is already full" });
    }

    captainRegisteration.membersOffered.push(member._id);
    captainRegisteration.markModified("membersOffered");
    await captainRegisteration.save();

    await notifyStudent(member._id, {
      type: "team_invitation",
      title: `Invitation to ${event.title}`,
      message: `${req.student.name} invited you to join their team.`,
      link: `/event/${eventId}`,
    });
    await writeAudit({ actorRole: "student", actorId: captainId, action: "team.invite", targetType: "student", targetId: member._id, metadata: { eventId } });

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

  const { eventId, studentId } = req.body;
  const memberId = req.student._id;

  try {
    const event = await eventModel.findById(eventId);
    if (!event) {
      return res.json({ success: false, msg: "Event not found" });
    }

    if (!registrationIsOpen(event)) {
      return res.status(400).json({ success: false, msg: "Registration is closed" });
    }
    if (!await requireActiveEventClub(event, res)) return;
    if (!await requireOpenRecruitment(res)) return;

    const captainRegisteration = await registerationEventModel.findOne({
      eventId,
      studentId: studentId,
      membersOffered: memberId,
    });

    if (!captainRegisteration) {
      return res.json({
        success: false,
        msg: "Invitation is no longer valid",
      });
    }

    const existingMembership = await eventMembershipModel.findOne({ eventId, studentId: memberId });
    const acceptedElsewhere = await registerationEventModel.exists({ eventId, membersAccepted: memberId });
    if (existingMembership || acceptedElsewhere) {
      return res.status(409).json({ success: false, msg: "You already belong to a team for this event" });
    }

    const maxTeamSize = event.maxTeamSize || event.maxParticipants || 1;
    if (captainRegisteration.membersAccepted.length + 1 >= maxTeamSize) {
      return res.status(400).json({ success: false, msg: "This team is full" });
    }

    try {
      await eventMembershipModel.create({
        eventId,
        registrationId: captainRegisteration._id,
        studentId: memberId,
        role: "member",
      });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({ success: false, msg: "You already belong to a team for this event" });
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
      await eventMembershipModel.deleteOne({ eventId, studentId: memberId });
      return res.status(409).json({ success: false, msg: "This team became full or the invitation expired" });
    }

    await registerationEventModel.updateMany(
      { eventId, _id: { $ne: captainRegisteration._id } },
      { $pull: { membersOffered: memberId } }
    );
    await notifyStudent(joinedRegistration.studentId, {
      type: "team_joined",
      title: "Team invitation accepted",
      message: `${req.student.name} joined your team for ${event.title}.`,
      link: `/event/${eventId}`,
    });
    await writeAudit({ actorRole: "student", actorId: memberId, action: "team.accept_invitation", targetType: "registration", targetId: joinedRegistration._id });

    return res.json({ success: true, msg: "Member accepted successfully" });
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

  const { eventId } = req.body;
  const captainId = req.student._id;

  try {
    const event = await eventModel.findById(eventId);
    if (!event) {
      return res.json({ success: false, msg: "Event not found" });
    }

    const registration = await registerationEventModel.findOne({
      eventId,
      studentId: captainId,
    });

    if (!registration) return res.status(404).json({ success: false, msg: "Registration not found" });
    if (registration.overallStatus === "withdrawn") return res.status(409).json({ success: false, msg: "Application is already withdrawn" });
    if (["selected", "rejected"].includes(registration.overallStatus)) {
      return res.status(400).json({ success: false, msg: "A final decision has already been recorded" });
    }
    const formerMembers = [...registration.membersAccepted];
    await Promise.all([
      recordApplicationHistory({ studentId: captainId, registration, role: "captain", reason: "withdrawn" }),
      ...formerMembers.map((studentId) => recordApplicationHistory({ studentId, registration, role: "member", reason: "withdrawn" })),
    ]);
    registration.overallStatus = "withdrawn";
    registration.membersAccepted = [];
    registration.membersOffered = [];
    await registration.save();
    await eventMembershipModel.deleteMany({ registrationId: registration._id });
    await Promise.all(formerMembers.map((studentId) => notifyStudent(studentId, {
      type: "team_disbanded",
      title: `Team withdrawn from ${event.title}`,
      message: "The team captain withdrew this application.",
      link: `/event/${eventId}`,
    })));
    await writeAudit({ actorRole: "student", actorId: captainId, action: "event.withdraw", targetType: "event", targetId: eventId });

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

  const { eventId, teamName } = req.body;
  const captainId = req.student._id;

  try {
    const event = await eventModel.findById(eventId);
    if (!event) {
      return res.json({ success: false, msg: "Event not found" });
    }

    if (!registrationIsOpen(event)) {
      return res.status(400).json({ success: false, msg: "Registration is closed" });
    }
    if (!await requireActiveEventClub(event, res)) return;
    if (!await requireOpenRecruitment(res)) return;

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
    await writeAudit({ actorRole: "student", actorId: captainId, action: "team.rename", targetType: "registration", targetId: captainRegisteration._id });

    return res.json({ success: true, msg: "Team name added successfully" });
  } catch (err) {
    console.error("Team name update failed:", err);
    return res.status(500).json({ success: false, msg: "Unable to update the team name" });
  }
};

module.exports.declineMemberOffer = async (req, res) => {
  const memberId = req.student._id;
  const registration = await registerationEventModel.findOneAndUpdate(
    { eventId: req.body.eventId, studentId: req.body.captainId, membersOffered: memberId },
    { $pull: { membersOffered: memberId } },
    { new: true }
  );
  if (!registration) return res.status(404).json({ success: false, msg: "Invitation not found" });
  await notifyStudent(registration.studentId, {
    type: "team_invitation_declined",
    title: "Team invitation declined",
    message: `${req.student.name} declined your team invitation.`,
    link: `/event/${req.body.eventId}`,
  });
  return res.json({ success: true, msg: "Invitation declined" });
};

module.exports.cancelMemberOffer = async (req, res) => {
  const member = await studentModel.findOne({ email: normalizeEmail(req.body.memberEmail) });
  if (!member) return res.status(404).json({ success: false, msg: "Student not found" });
  const registration = await registerationEventModel.findOneAndUpdate(
    { eventId: req.body.eventId, studentId: req.student._id, membersOffered: member._id },
    { $pull: { membersOffered: member._id } },
    { new: true }
  );
  if (!registration) return res.status(404).json({ success: false, msg: "Pending invitation not found" });
  return res.json({ success: true, msg: "Invitation cancelled" });
};

module.exports.removeTeamMember = async (req, res) => {
  const event = await eventModel.findById(req.body.eventId);
  if (!event) return res.status(404).json({ success: false, msg: "Event not found" });
  if (!registrationIsOpen(event)) return res.status(400).json({ success: false, msg: "Team changes are closed" });
  if (!await requireActiveEventClub(event, res)) return;
  if (!await requireOpenRecruitment(res)) return;
  const registration = await registerationEventModel.findOneAndUpdate(
    { eventId: req.body.eventId, studentId: req.student._id, membersAccepted: req.body.memberId },
    { $pull: { membersAccepted: req.body.memberId } },
    { new: true }
  );
  if (!registration) return res.status(404).json({ success: false, msg: "Team member not found" });
  await recordApplicationHistory({ studentId: req.body.memberId, registration, role: "member", reason: "removed" });
  await eventMembershipModel.deleteOne({ eventId: req.body.eventId, studentId: req.body.memberId, role: "member" });
  await writeAudit({ actorRole: "student", actorId: req.student._id, action: "team.remove_member", targetType: "registration", targetId: registration._id, metadata: { memberId: req.body.memberId } });
  await notifyStudent(req.body.memberId, {
    type: "team_removed",
    title: "Removed from team",
    message: "The team captain removed you from the event team.",
    link: `/event/${req.body.eventId}`,
  });
  return res.json({ success: true, msg: "Team member removed" });
};

module.exports.leaveTeam = async (req, res) => {
  const event = await eventModel.findById(req.body.eventId);
  if (!event) return res.status(404).json({ success: false, msg: "Event not found" });
  if (!registrationIsOpen(event)) return res.status(400).json({ success: false, msg: "Team changes are closed" });
  if (!await requireActiveEventClub(event, res)) return;
  if (!await requireOpenRecruitment(res)) return;
  const membership = await eventMembershipModel.findOne({
    eventId: req.body.eventId,
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
  await membership.deleteOne();
  await writeAudit({ actorRole: "student", actorId: req.student._id, action: "team.leave", targetType: "registration", targetId: membership.registrationId });
  if (registration) {
    await notifyStudent(registration.studentId, {
      type: "team_member_left",
      title: "Team member left",
      message: `${req.student.name} left your event team.`,
      link: `/event/${req.body.eventId}`,
    });
  }
  return res.json({ success: true, msg: "You left the team" });
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
    role: history.role,
    joinedAt: history.createdAt,
    history: true,
    reason: history.reason,
    registrationId: {
      _id: history.registrationId,
      eventId: history.eventId,
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

  return res.json({ success: true, applications: [...memberships, ...applicationHistory, ...legacyHistory] });
};

module.exports.getNotifications = async (req, res) => {
  const notifications = await notificationModel.find({ studentId: req.student._id }).sort({ createdAt: -1 }).limit(100);
  const unreadCount = await notificationModel.countDocuments({ studentId: req.student._id, readAt: null });
  return res.json({ success: true, notifications, unreadCount });
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

  const sessionAt = new Date(`${session.date}T${session.time}:00+05:30`);
  if (Number.isNaN(sessionAt.getTime())) return res.status(400).json({ success: false, msg: "Session schedule is incomplete" });
  if (sessionAt <= new Date()) return res.status(400).json({ success: false, msg: "Session has already started" });

  const confirmedCount = await sessionRsvpModel.countDocuments({
    sessionId: session._id,
    status: { $in: ["confirmed", "attended"] },
  });
  await sessionModel.updateOne(
    { _id: session._id, confirmedRsvpCount: { $exists: false } },
    { $set: { confirmedRsvpCount: confirmedCount } }
  );

  const existing = await sessionRsvpModel.findOne({ sessionId: session._id, studentId: req.student._id });
  if (["confirmed", "attended"].includes(existing?.status)) {
    return res.json({ success: true, msg: "RSVP already confirmed", rsvp: existing });
  }

  let status = "confirmed";
  let reservedSlot = false;
  if (session.capacity) {
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
    const reservedSession = await sessionModel.findOneAndUpdate(
      { _id: session._id, status: "published" },
      { $inc: { confirmedRsvpCount: 1 } },
      { new: true }
    );
    reservedSlot = Boolean(reservedSession);
    if (!reservedSlot) return res.status(409).json({ success: false, msg: "Session is no longer available" });
  }

  let rsvp;
  try {
    rsvp = await sessionRsvpModel.findOneAndUpdate(
      { sessionId: session._id, studentId: req.student._id },
      { status, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (reservedSlot) {
      await sessionModel.updateOne({ _id: session._id, confirmedRsvpCount: { $gt: 0 } }, { $inc: { confirmedRsvpCount: -1 } });
    }
    throw error;
  }
  await writeAudit({ actorRole: "student", actorId: req.student._id, action: `session.rsvp_${status}`, targetType: "session", targetId: session._id });
  return res.json({ success: true, msg: status === "confirmed" ? "RSVP confirmed" : "Added to waitlist", rsvp });
};

module.exports.cancelSessionRsvp = async (req, res) => {
  const confirmedCount = await sessionRsvpModel.countDocuments({
    sessionId: req.body.sessionId,
    status: { $in: ["confirmed", "attended"] },
  });
  await sessionModel.updateOne(
    { _id: req.body.sessionId, confirmedRsvpCount: { $exists: false } },
    { $set: { confirmedRsvpCount: confirmedCount } }
  );
  const rsvp = await sessionRsvpModel.findOneAndUpdate(
    { sessionId: req.body.sessionId, studentId: req.student._id, status: { $in: ["confirmed", "waitlisted"] } },
    { status: "cancelled", updatedAt: new Date() },
    { new: false }
  );
  if (!rsvp) return res.status(404).json({ success: false, msg: "Active RSVP not found" });
  if (rsvp.status === "confirmed") {
    await sessionModel.updateOne({ _id: rsvp.sessionId, confirmedRsvpCount: { $gt: 0 } }, { $inc: { confirmedRsvpCount: -1 } });
    const promoted = await sessionRsvpModel.findOneAndUpdate(
      { sessionId: rsvp.sessionId, status: "waitlisted" },
      { status: "confirmed", updatedAt: new Date() },
      { new: true, sort: { createdAt: 1 } }
    );
    if (promoted) {
      await sessionModel.updateOne({ _id: rsvp.sessionId }, { $inc: { confirmedRsvpCount: 1 } });
      await notifyStudent(promoted.studentId, {
        type: "session_rsvp_promoted",
        title: "Your RSVP is confirmed",
        message: "A place opened up and you have been moved from the waitlist.",
        link: `/session/${rsvp.sessionId}`,
      });
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
    await writeAudit({ actorRole: "student", actorId: student._id, action: "auth.password_reset", targetType: "student", targetId: student._id });

    clearSessionCookie(res, "student");
    return res.json({ success: true, msg: "Password updated successfully" });
  } catch (err) {
    console.error("Password reset failed:", err);
    return res.status(500).json({ success: false, msg: "Unable to reset password" });
  }
};
