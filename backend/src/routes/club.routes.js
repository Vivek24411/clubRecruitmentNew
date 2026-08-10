const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const { clubLogin, logout, changePassword, sendPasswordResetOtp, verifyPasswordResetOtp, resetPassword, addSession, getProfile, updateProfile, getSessions, getSession, addEvent, getEvents, getEvent, getDashBoard, getEventsRegisteredStudents, finalizeStudent, scheduleInterview, selectStudentForRound, updateEvent, updateEventStatus, updateSession, updateApplication, bulkUpdateApplications, exportApplications, getSessionAttendees, markAttendance } = require("../controllers/club.contollers");
const { clubAuth } = require("../middlewares/auth.middlewares");
const upload = require("../middlewares/upload");
const rateLimit = require("../middlewares/rateLimit");
const validateRequest = require("../middlewares/validateRequest");

const loginRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: "club-login", persistent: true });
const resetRequestRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, keyPrefix: "club-password-reset", persistent: true });
const resetVerifyRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: "club-password-reset-verify", persistent: true });
const passwordChangeRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, keyPrefix: "club-password-change", persistent: true });
const fitsBcrypt = (value) => Buffer.byteLength(String(value), "utf8") <= 72;

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
  [
    body("title").isString().trim().isLength({ min: 2, max: 150 }),
    body("shortDescription").isString().trim().isLength({ min: 2, max: 500 }),
    body("longDescription").optional().isString().isLength({ max: 10000 }),
    body("date").isISO8601({ strict: true }),
    body("time").matches(/^([01]\d|2[0-3]):[0-5]\d$/),
    body("duration").isInt({ min: 1, max: 1440 }).withMessage("Duration must be a positive integer"),
    body("venue").isString().trim().isLength({ min: 1, max: 300 }),
    body("capacity").optional({ nullable: true }).isInt({ min: 1 }),
    body("status").optional().isIn(["draft", "published"]),
  ], validateRequest,
  addSession
);

router.get('/getProfile',clubAuth,getProfile)

router.post('/updateProfile',clubAuth,[

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
], validateRequest, updateProfile)

router.get('/getSessions',clubAuth,getSessions)

router.get('/getSession', clubAuth, [
  query('sessionId').isMongoId().withMessage('sessionId is required')
], validateRequest, getSession)

router.post('/addEvent',clubAuth,
  upload.single('eventBanner'),[
  body("title").isString().trim().isLength({ min: 2, max: 150 }),
  body("shortDescription").isString().trim().isLength({ min: 2, max: 500 }),
  body("longDescription").isString().isLength({ min: 2, max: 10000 }),
  body("registerationDeadline").isISO8601({ strict: true }),
  body("maxParticipants").isInt({ min: 1, max: 10000 }),
  // Remove array validation as we're now handling them differently
  body('numberOfRounds').optional().isInt({ min: 0, max: 20 }),
  body('eligibility').optional().isString().isLength({ max: 2000 }),
  body('registrationType').optional().isIn(['individual', 'team', 'optional_team']),
  body('minTeamSize').optional().isInt({ min: 1 }),
  body('maxTeamSize').optional().isInt({ min: 1, max: 10000 }),
  body('status').optional().isIn(['draft', 'published']),
  body('roundDetailsJSON').custom((value, { req }) => {
    const expectedRounds = Number(req.body.numberOfRounds || 0);
    if (!value) {
      if (expectedRounds === 0) return true;
      throw new Error('Round details are required');
    }
    try {
      if (String(value).length > 10000) throw new Error();
      const rounds = JSON.parse(value);
      if (!Array.isArray(rounds) || rounds.length > 20) throw new Error();
      if (expectedRounds !== rounds.length) throw new Error();
      if (rounds.some((round) => !round || typeof round !== 'object' || typeof round.Type !== 'string' || round.Type.length > 100)) throw new Error();
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

router.patch('/events/:eventId', clubAuth, upload.single('eventBanner'), [
  param('eventId').isMongoId(),
  body('title').optional().isString().trim().isLength({ min: 2, max: 150 }),
  body('shortDescription').optional().isString().isLength({ max: 500 }),
  body('longDescription').optional().isString().isLength({ max: 10000 }),
  body('eligibility').optional().isString().isLength({ max: 2000 }),
  body('registerationDeadline').optional({ checkFalsy: true }).isISO8601({ strict: true }),
  body('maxParticipants').optional().isInt({ min: 1, max: 10000 }),
  body('numberOfRounds').optional().isInt({ min: 0, max: 20 }),
  body('registrationType').optional().isIn(['individual', 'team', 'optional_team']),
  body('minTeamSize').optional().isInt({ min: 1 }),
  body('maxTeamSize').optional().isInt({ min: 1, max: 10000 }),
], validateRequest, updateEvent)

router.patch('/events/:eventId/status', clubAuth, [
  param('eventId').isMongoId(),
  body('status').isIn(['draft', 'published', 'closed', 'archived', 'cancelled']),
], validateRequest, updateEventStatus)

router.patch('/sessions/:sessionId', clubAuth, [
  param('sessionId').isMongoId(),
  body('title').optional().isString().trim().isLength({ min: 2, max: 150 }),
  body('shortDescription').optional().isString().isLength({ max: 500 }),
  body('longDescription').optional().isString().isLength({ max: 10000 }),
  body('date').optional().isISO8601({ strict: true }),
  body('time').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body('duration').optional().isInt({ min: 1, max: 1440 }),
  body('venue').optional().isString().trim().isLength({ max: 300 }),
  body('status').optional().isIn(['draft', 'published', 'cancelled', 'completed', 'archived']),
  body('capacity').optional({ nullable: true }).isInt({ min: 1 }),
], validateRequest, updateSession)

router.get('/getDashBoard', clubAuth,getDashBoard)

router.get('/getEventsRegisteredStudents', clubAuth,[
  query('eventId').isMongoId().withMessage('eventId is required')
], validateRequest, getEventsRegisteredStudents)

router.post('/finalizeStudent', clubAuth,[
  body('eventId').isMongoId().withMessage('eventId is required'),
  body('studentId').isMongoId().withMessage('studentId is required'),
], validateRequest, finalizeStudent)

router.post('/scheduleInterview', clubAuth,[
  body('eventId').isMongoId().withMessage('eventId is required'),
  body('studentId').isMongoId().withMessage('studentId is required'),
  body('roundNumber').isInt({ min: 1, max: 20 }).withMessage('roundNumber is required'),
  body('roundDate').isISO8601().withMessage('roundDate is required'),
], validateRequest, scheduleInterview)

router.post('/selectStudentForRound', clubAuth,[
  body('eventId').isMongoId().withMessage('eventId is required'),
  body('studentId').isMongoId().withMessage('studentId is required'),
  body('roundNumber').isInt({ min: 1, max: 20 }).withMessage('roundNumber is required'),
], validateRequest, selectStudentForRound)

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

router.get('/events/:eventId/applications/export', clubAuth, [param('eventId').isMongoId()], validateRequest, exportApplications)
router.get('/sessions/:sessionId/attendees', clubAuth, [param('sessionId').isMongoId()], validateRequest, getSessionAttendees)
router.patch('/sessions/:sessionId/attendance', clubAuth, [
  param('sessionId').isMongoId(),
  body('studentId').isMongoId(),
  body('status').isIn(['attended', 'absent']),
], validateRequest, markAttendance)



module.exports = router;
