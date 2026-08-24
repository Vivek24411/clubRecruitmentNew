const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const { clubLogin, logout, changePassword, sendPasswordResetOtp, verifyPasswordResetOtp, resetPassword, addSession, getProfile, updateProfile, getSessions, getSession, addEvent, getEvents, getEvent, getDashBoard, updateEvent, updateEventStatus, deleteEvent, updateSession, deleteSession, updateApplication, bulkUpdateApplications, exportApplications, getSessionAttendees, markAttendance } = require("../controllers/club.contollers");
const { clubAuth } = require("../middlewares/auth.middlewares");
const upload = require("../middlewares/upload");
const { attachDirectAsset, signDirectUpload } = require("../middlewares/directUpload");
const {
  getEventWorkflow,
  publishRoundDecisions,
  scheduleCandidate,
  autoScheduleRound,
  cancelScheduleSlot,
  extractCandidates,
  exportRoundCandidates,
  updateCandidateReview,
} = require("../controllers/workflow.controllers");
const rateLimit = require("../middlewares/rateLimit");
const validateRequest = require("../middlewares/validateRequest");

const loginRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: "club-login", persistent: true, keyGenerator: rateLimit.bodyIdentifier("userName") });
const resetRequestRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, keyPrefix: "club-password-reset", persistent: true, keyGenerator: rateLimit.bodyIdentifier("userName", "email") });
const resetVerifyRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: "club-password-reset-verify", persistent: true, keyGenerator: rateLimit.bodyIdentifier("userName", "email") });
const passwordChangeRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, keyPrefix: "club-password-change", persistent: true, keyGenerator: rateLimit.sessionOrIp });
const fitsBcrypt = (value) => Buffer.byteLength(String(value), "utf8") <= 72;
const validOptionalCapacity = (value) => {
  if (value === "") return true;
  if (!["string", "number"].includes(typeof value)) return false;
  const capacity = Number(value);
  return Number.isInteger(capacity) && capacity >= 1;
};
const validVerticals = (value) => {
  try {
    const verticals = JSON.parse(value);
    if (!Array.isArray(verticals) || verticals.length < 1 || verticals.length > 20) throw new Error();
    if (verticals.some((vertical) => !vertical
      || typeof vertical !== 'object'
      || typeof vertical.title !== 'string'
      || vertical.title.trim().length < 2
      || vertical.title.length > 120
      || (vertical.rounds !== undefined && (!Array.isArray(vertical.rounds) || vertical.rounds.length > 20)))) {
      throw new Error();
    }
    return true;
  } catch {
    throw new Error('Vertical details are invalid');
  }
};

const validProgrammeEligibility = (value) => {
  const maxYears = { undergraduate: 5, mtech: 2, msc: 2, mba: 2, phd: 5 };
  try {
    const rules = JSON.parse(value);
    if (!Array.isArray(rules) || rules.length < 1 || rules.length > 5) throw new Error();
    const programmes = rules.map((rule) => rule?.programme);
    if (new Set(programmes).size !== programmes.length) throw new Error();
    if (rules.some((rule) => !maxYears[rule?.programme]
      || !Array.isArray(rule.years)
      || rule.years.some((year) => !Number.isInteger(Number(year)) || Number(year) < 1 || Number(year) > maxYears[rule.programme]))) {
      throw new Error();
    }
    return true;
  } catch {
    throw new Error("Programme eligibility is invalid");
  }
};

router.post('/uploads/sign', clubAuth, [
  body('kind').isIn(['clubLogo', 'clubBanner', 'eventBanner', 'sessionThumbnail']),
], validateRequest, signDirectUpload(['clubLogo', 'clubBanner', 'eventBanner', 'sessionThumbnail']))

router.post(
  "/login",
  loginRateLimit,
  [
    body("userName").isString().trim().isLength({ min: 1, max: 80 }),
    body("password").isLength({ min: 5, max: 128 }),
  ],
  validateRequest,
  clubLogin
);

router.post('/logout', logout)

router.post('/changePassword', clubAuth, passwordChangeRateLimit, [
  body("currentPassword").isString().isLength({ min: 1, max: 128 }),
  body("newPassword").isLength({ min: 10, max: 128 }).custom(fitsBcrypt).withMessage("Password must be 10–72 bytes long"),
], validateRequest, changePassword)

router.post('/password-reset/request', resetRequestRateLimit, [
  body("userName").isString().trim().isLength({ min: 1, max: 80 }),
  body("email").isEmail().bail().customSanitizer((value) => value.trim().toLowerCase()).isLength({ max: 254 }),
], validateRequest, sendPasswordResetOtp)

router.post('/password-reset/verify', resetVerifyRateLimit, [
  body("userName").isString().trim().isLength({ min: 1, max: 80 }),
  body("email").isEmail().bail().customSanitizer((value) => value.trim().toLowerCase()).isLength({ max: 254 }),
  body("otp").isLength({ min: 6, max: 6 }).isNumeric(),
], validateRequest, verifyPasswordResetOtp)

router.post('/password-reset/complete', resetVerifyRateLimit, [
  body("userName").isString().trim().isLength({ min: 1, max: 80 }),
  body("email").isEmail().bail().customSanitizer((value) => value.trim().toLowerCase()).isLength({ max: 254 }),
  body("newPassword").isLength({ min: 10, max: 128 }).custom(fitsBcrypt).withMessage("Password must be 10–72 bytes long"),
  body("resetToken").isString().isLength({ min: 20, max: 128 }),
], validateRequest, resetPassword)

router.post(
  "/addSession",
  clubAuth,
  upload.bannerUpload.single('sessionThumbnail'),
  attachDirectAsset('sessionThumbnail'),
  [
    body("title").isString().trim().isLength({ min: 2, max: 150 }),
    body("shortDescription").isString().trim().isLength({ min: 2, max: 500 }),
    body("longDescription").optional().isString().isLength({ max: 10000 }),
    body("date").isISO8601({ strict: true }),
    body("time").matches(/^([01]\d|2[0-3]):[0-5]\d$/),
    body("duration").isInt({ min: 1, max: 1440 }).withMessage("Duration must be a positive integer"),
    body("venue").optional({ checkFalsy: true }).isString().trim().isLength({ max: 300 }),
    body("meetingUrl").optional({ checkFalsy: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }).isLength({ max: 2048 }),
    body("capacity").optional({ nullable: true }).custom(validOptionalCapacity)
      .withMessage("Capacity must be a whole number of at least 1, or left blank for unlimited"),
    body("status").optional().isIn(["draft", "published"]),
  ], validateRequest,
  addSession
);

router.get('/getProfile',clubAuth,getProfile)

router.post('/updateProfile',clubAuth,upload.single('clubLogo'),attachDirectAsset('clubLogo'),attachDirectAsset('clubBanner', 'directBannerAsset', 'clubBannerFile'),[

  body("name").optional().isString().trim().isLength({ min: 2, max: 150 }),
  body("userName").optional().isString().trim().isLength({ min: 1, max: 80 }),
  body("shortDescription").optional().isString().isLength({ max: 500 }),
  body("longDescription").optional().isString().isLength({ max: 10000 }),
  body("website").optional({ checkFalsy: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }),
  body("linkedin").optional({ checkFalsy: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }),
  body("instagram").optional({ checkFalsy: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }),
  body("achivements").optional().isString().isLength({ max: 10000 }),
  body("recruitmentMethods").optional().isString().isLength({ max: 10000 }),
  body("contactEmail").optional({ checkFalsy: true }).isEmail().isLength({ max: 254 }),
  body("contactPhone").optional({ checkFalsy: true }).isString().isLength({ max: 30 }),
  body("useAccountEmailForContact").optional().isBoolean(),
  body("contactPersonsJSON").optional().isString().isLength({ max: 10000 }),
  body("resourcesJSON").optional().isString().isLength({ max: 60000 }),
  body("annualEventsJSON").optional().isString().isLength({ max: 100000 }),
], validateRequest, updateProfile)

router.get('/getSessions',clubAuth,getSessions)

router.get('/getSession', clubAuth, [
  query('sessionId').isMongoId().withMessage('sessionId is required')
], validateRequest, getSession)

router.post('/addEvent',clubAuth,
  upload.bannerUpload.single('eventBanner'),attachDirectAsset('eventBanner'),[
  body("title").isString().trim().isLength({ min: 2, max: 150 }),
  body("shortDescription").isString().trim().isLength({ min: 2, max: 500 }),
  body("longDescription").isString().isLength({ min: 2, max: 10000 }),
  body("registerationDeadline").optional({ checkFalsy: true }).isISO8601({ strict: true }),
  body("registrationDeadlineAt").optional({ checkFalsy: true }).isISO8601(),
  body().custom((value) => value.registrationDeadlineAt || value.registerationDeadline).withMessage("Registration deadline is required"),
  body("maxParticipants").optional({ checkFalsy: true, nullable: true }).isInt({ min: 1, max: 10000 }),
  // Remove array validation as we're now handling them differently
  body('numberOfRounds').optional().isInt({ min: 0, max: 20 }),
  body('eligibility').optional().isString().isLength({ max: 2000 }),
  body('registrationType').optional().isIn(['individual', 'team', 'optional_team']),
  body('minTeamSize').optional().isInt({ min: 1 }),
  body('maxTeamSize').optional().isInt({ min: 1, max: 10000 }),
  body('status').optional().isIn(['draft', 'published']),
  body('eventType').optional().isIn(['recruitment', 'hackathon', 'competition', 'workshop', 'other']),
  body('eligibilityMode').optional().isIn(['undergraduate', 'all_iitr']),
  body('programmeEligibilityJSON').optional().isString().isLength({ max: 2000 }).custom(validProgrammeEligibility),
  body('eligibilityYearsJSON').optional().isString().isLength({ max: 100 }),
  body('deadlineNotificationsEnabled').optional().isBoolean(),
  body('verticalsEnabled').optional().isBoolean(),
  body('verticalsJSON').optional().isString().isLength({ max: 400000 }).custom(validVerticals),
  body('maxVerticalApplications').optional({ checkFalsy: true, nullable: true }).isInt({ min: 1, max: 20 }),
  body('roundsJSON').optional().isString().isLength({ max: 200000 }),
  body('contactInfoJSON').optional().isString().isLength({ max: 10000 }),
  body('roundDetailsJSON').optional().custom((value, { req }) => {
    const expectedRounds = Number(req.body.numberOfRounds || 0);
    const roundValue = req.body.roundsJSON || value;
    if (!roundValue) {
      if (expectedRounds === 0) return true;
      throw new Error('Round details are required');
    }
    try {
      if (String(roundValue).length > 200000) throw new Error();
      const rounds = JSON.parse(roundValue);
      if (!Array.isArray(rounds) || rounds.length > 20) throw new Error();
      if (expectedRounds !== rounds.length) throw new Error();
      if (rounds.some((round) => !round || typeof round !== 'object' || typeof (round.title || round.Type) !== 'string' || String(round.title || round.Type).length > 120)) throw new Error();
      return true;
    } catch {
      throw new Error('Round details are invalid');
    }
  })
], validateRequest, addEvent)

router.get('/getEvents', clubAuth,getEvents)

router.get('/getEvent', clubAuth, [
  query('eventId').isMongoId().withMessage('eventId is required')
], validateRequest, getEvent)

router.patch('/events/:eventId', clubAuth, upload.bannerUpload.single('eventBanner'), attachDirectAsset('eventBanner'), [
  param('eventId').isMongoId(),
  body('title').optional().isString().trim().isLength({ min: 2, max: 150 }),
  body('shortDescription').optional().isString().isLength({ max: 500 }),
  body('longDescription').optional().isString().isLength({ max: 10000 }),
  body('eligibility').optional().isString().isLength({ max: 2000 }),
  body('registerationDeadline').optional({ checkFalsy: true }).isISO8601({ strict: true }),
  body('registrationDeadlineAt').optional({ checkFalsy: true }).isISO8601(),
  body('maxParticipants').optional({ checkFalsy: true, nullable: true }).isInt({ min: 1, max: 10000 }),
  body('numberOfRounds').optional().isInt({ min: 0, max: 20 }),
  body('registrationType').optional().isIn(['individual', 'team', 'optional_team']),
  body('minTeamSize').optional().isInt({ min: 1 }),
  body('maxTeamSize').optional().isInt({ min: 1, max: 10000 }),
  body('eventType').optional().isIn(['recruitment', 'hackathon', 'competition', 'workshop', 'other']),
  body('verticalsEnabled').optional().isBoolean(),
  body('verticalsJSON').optional().isString().isLength({ max: 400000 }).custom(validVerticals),
  body('maxVerticalApplications').optional({ checkFalsy: true, nullable: true }).isInt({ min: 1, max: 20 }),
  body('roundsJSON').optional().isString().isLength({ max: 200000 }),
  body('contactInfoJSON').optional().isString().isLength({ max: 10000 }),
  body('eligibilityMode').optional().isIn(['undergraduate', 'all_iitr']),
  body('programmeEligibilityJSON').optional().isString().isLength({ max: 2000 }).custom(validProgrammeEligibility),
  body('eligibilityYearsJSON').optional().isString().isLength({ max: 100 }),
  body('deadlineNotificationsEnabled').optional().isBoolean(),
  body('notifyRegistrants').optional().isBoolean(),
], validateRequest, updateEvent)

router.patch('/events/:eventId/status', clubAuth, [
  param('eventId').isMongoId(),
  body('status').isIn(['draft', 'published', 'closed', 'archived', 'cancelled']),
], validateRequest, updateEventStatus)

router.delete('/events/:eventId', clubAuth, [
  param('eventId').isMongoId(),
  body('confirmation').isString().isLength({ min: 1, max: 150 }),
], validateRequest, deleteEvent)

router.patch('/sessions/:sessionId', clubAuth, upload.bannerUpload.single('sessionThumbnail'), attachDirectAsset('sessionThumbnail'), [
  param('sessionId').isMongoId(),
  body('title').optional().isString().trim().isLength({ min: 2, max: 150 }),
  body('shortDescription').optional().isString().isLength({ max: 500 }),
  body('longDescription').optional().isString().isLength({ max: 10000 }),
  body('date').optional().isISO8601({ strict: true }),
  body('time').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body('duration').optional().isInt({ min: 1, max: 1440 }),
  body('venue').optional().isString().trim().isLength({ max: 300 }),
  body('meetingUrl').optional({ checkFalsy: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }).isLength({ max: 2048 }),
  body('status').optional().isIn(['draft', 'published', 'cancelled', 'completed', 'archived']),
  body('capacity').optional({ nullable: true }).custom(validOptionalCapacity)
    .withMessage("Capacity must be a whole number of at least 1, or left blank for unlimited"),
], validateRequest, updateSession)

router.delete('/sessions/:sessionId', clubAuth, [
  param('sessionId').isMongoId(),
  body('confirmation').isString().isLength({ min: 1, max: 150 }),
], validateRequest, deleteSession)

router.get('/getDashBoard', clubAuth,getDashBoard)

router.patch('/events/:eventId/applications/:registrationId', clubAuth, [
  param('eventId').isMongoId(),
  param('registrationId').isMongoId(),
  body('overallStatus').optional().isIn(['submitted', 'in_progress', 'waitlisted', 'selected', 'rejected']),
  body('reviewerNotes').optional().isString().isLength({ max: 4000 }),
  body('score').optional({ nullable: true }).isFloat({ min: 0, max: 100 }),
], validateRequest, updateApplication)

router.post('/events/:eventId/applications/bulk', clubAuth, [
  param('eventId').isMongoId(),
  body('registrationIds').isArray({ min: 1, max: 100 }),
  body('registrationIds.*').isMongoId(),
  body('overallStatus').isIn(['submitted', 'in_progress', 'waitlisted', 'selected', 'rejected']),
], validateRequest, bulkUpdateApplications)

router.get('/events/:eventId/applications/export', clubAuth, [
  param('eventId').isMongoId(),
  query('verticalId').optional().isMongoId(),
], validateRequest, exportApplications)
router.get('/events/:eventId/rounds/:roundId/export', clubAuth, [
  param('eventId').isMongoId(),
  param('roundId').isMongoId(),
  query('status').optional().isIn(['all', 'eligible', 'scheduled', 'active', 'submitted', 'under_review', 'waitlisted', 'advanced', 'rejected', 'missed']),
  query('search').optional().isString().isLength({ max: 100 }),
], validateRequest, exportRoundCandidates)
router.get('/sessions/:sessionId/attendees', clubAuth, [param('sessionId').isMongoId()], validateRequest, getSessionAttendees)
router.patch('/sessions/:sessionId/attendance', clubAuth, [
  param('sessionId').isMongoId(),
  body('studentId').optional().isMongoId(),
  body('studentEmail').optional().isEmail().normalizeEmail(),
  body().custom((value) => value.studentId || value.studentEmail).withMessage('Student ID or email is required'),
  body('status').isIn(['attended', 'absent']),
], validateRequest, markAttendance)

router.get('/events/:eventId/workflow', clubAuth, [
  param('eventId').isMongoId(),
  query('verticalId').optional().isMongoId(),
  query('roundId').optional().isMongoId(),
  query('status').optional().isIn(['all', 'eligible', 'scheduled', 'active', 'submitted', 'under_review', 'waitlisted', 'advanced', 'rejected', 'missed']),
  query('search').optional().isString().isLength({ max: 100 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 10, max: 100 }),
], validateRequest, getEventWorkflow)

router.post('/events/:eventId/rounds/:roundId/decisions', clubAuth, [
  param('eventId').isMongoId(),
  param('roundId').isMongoId(),
  body('decisions').isArray({ min: 1, max: 250 }),
  body('decisions.*.candidateId').isMongoId(),
  body('decisions.*.status').isIn(['advanced', 'waitlisted', 'rejected']),
  body('decisions.*.score').optional({ nullable: true }).isFloat({ min: 0 }),
  body('decisions.*.notes').optional({ nullable: true }).isString().isLength({ max: 4000 }),
], validateRequest, publishRoundDecisions)

router.patch('/events/:eventId/rounds/:roundId/candidates/:candidateId', clubAuth, [
  param('eventId').isMongoId(),
  param('roundId').isMongoId(),
  param('candidateId').isMongoId(),
  body('score').optional({ nullable: true }).isFloat({ min: 0 }),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 4000 }),
], validateRequest, updateCandidateReview)

router.post('/events/:eventId/rounds/:roundId/slots', clubAuth, [
  param('eventId').isMongoId(),
  param('roundId').isMongoId(),
  body('candidateId').isMongoId(),
  body('startAt').isISO8601(),
  body('endAt').isISO8601(),
  body('venue').optional({ checkFalsy: true }).isString().isLength({ max: 300 }),
  body('meetingUrl').optional({ checkFalsy: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }),
], validateRequest, scheduleCandidate)

router.post('/events/:eventId/rounds/:roundId/slots/auto', clubAuth, [
  param('eventId').isMongoId(),
  param('roundId').isMongoId(),
  body('candidateIds').isArray({ min: 1, max: 250 }),
  body('candidateIds.*').isMongoId(),
  body('startAt').isISO8601(),
  body('endAt').isISO8601(),
  body('durationMinutes').optional().isInt({ min: 5, max: 480 }),
  body('bufferMinutes').optional().isInt({ min: 0, max: 120 }),
  body('venue').optional({ checkFalsy: true }).isString().isLength({ max: 300 }),
  body('meetingUrl').optional({ checkFalsy: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }),
], validateRequest, autoScheduleRound)

router.delete('/events/:eventId/slots/:slotId', clubAuth, [
  param('eventId').isMongoId(),
  param('slotId').isMongoId(),
], validateRequest, cancelScheduleSlot)

router.post('/events/:eventId/rounds/:roundId/extract', clubAuth, [
  param('eventId').isMongoId(),
  param('roundId').isMongoId(),
  body('candidateIds').isArray({ min: 1, max: 250 }),
  body('candidateIds.*').isMongoId(),
  body('targetEventId').isMongoId(),
  body('targetRoundId').isMongoId(),
], validateRequest, extractCandidates)



module.exports = router;
