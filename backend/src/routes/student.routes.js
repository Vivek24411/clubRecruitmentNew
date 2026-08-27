const express = require("express");
const { query, body, param } = require("express-validator");
const {
  register,
  verifyOtp,
  sendOtp,
  login,
  getProfile,
  getAllSessions,
  getSession,
  getAllClubs,
  getClub,
  getAllEvents,
  getClubEvents,
  getEvent,
  getClubSessions,
  getDashBoard,
  registerEvent,
  getEventDetails,
  addMemberOffer,
  acceptMemberOffer,
  unregisteredAsCaptain,
  addTeamName,
  forgotPassword,
  logout,
  updateProfile,
  changePassword,
  declineMemberOffer,
  cancelMemberOffer,
  removeTeamMember,
  leaveTeam,
  transferCaptain,
  getMyApplications,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  rsvpSession,
  cancelSessionRsvp,
  getSessionRsvp,
  getAcademicOptions,
  submitInitialApplication,
} = require("../controllers/student.controllers");
const { optionalStudentAuth, studentAuth } = require("../middlewares/auth.middlewares");
const rateLimit = require("../middlewares/rateLimit");
const validateRequest = require("../middlewares/validateRequest");
const upload = require("../middlewares/upload");
const { attachDirectAsset, attachDirectAssets, signDirectUpload } = require("../middlewares/directUpload");
const { getMyEventWorkflow, submitRoundWork } = require("../controllers/workflow.controllers");
const { checkEmailDomain } = require("../services/student.services");
const { catalogueCache, publicCache } = require("../middlewares/cacheControl");
const { registerPushInstallation, unregisterPushInstallation, getPushInstallationStatus } = require("../controllers/push.controllers");
const router = express.Router();
const fitsBcrypt = (value) => Buffer.byteLength(String(value), "utf8") <= 72;
const isIitrEmail = (value) => checkEmailDomain(value);

// This is only a last-resort abuse ceiling. A campus NAT may legitimately
// carry several requests for each of 4,000 accounts during launch week.
const authIpCeiling = rateLimit({ windowMs: 15 * 60 * 1000, max: 20000, keyPrefix: "student-auth-ip", persistent: true });
const otpRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, keyPrefix: "otp", persistent: true, keyGenerator: rateLimit.bodyIdentifier("email", "purpose") });
const verifyRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: "otp-verify", persistent: true, keyGenerator: rateLimit.bodyIdentifier("email", "purpose") });
const loginRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: "student-login", persistent: true, keyGenerator: rateLimit.bodyIdentifier("email") });

router.post(
  "/sendOtp",
  authIpCeiling,
  otpRateLimit,
  [
    body("email").custom(isIitrEmail).withMessage("Invalid IITR email address").bail().normalizeEmail().isLength({ max: 254 }),
    body("purpose").optional().isIn(["signup", "password_reset"]),
  ],
  validateRequest,
  sendOtp
);

router.post("/verifyOtp", authIpCeiling, verifyRateLimit, [
    body("email").custom(isIitrEmail).withMessage("Invalid IITR email address"),
    body("otp").isLength({ min: 6, max: 6 }).isNumeric().withMessage("Invalid OTP"),
    body("purpose").optional().isIn(["signup", "password_reset"]),
], validateRequest, verifyOtp);

router.get('/academic-options', publicCache(300), getAcademicOptions)

router.post("/register",[
    body('email').custom(isIitrEmail).withMessage("Invalid IITR email address"),
    body('password').isLength({ min: 10, max: 128 }).custom(fitsBcrypt).withMessage("Password must be 10–72 bytes long"),
    body('name').isString().trim().isLength({ min: 2, max: 100 }).withMessage("Name must be between 2 and 100 characters"),
    body('programme').isIn(['undergraduate', 'mtech', 'msc', 'mba', 'phd']).withMessage("Programme must be valid"),
    body('branch').isString().trim().isLength({ min: 2, max: 100 }).withMessage("Branch or discipline must be between 2 and 100 characters"),
    body('academicYear').optional().isInt({ min: 1, max: 5 }).withMessage("Year must be valid"),
    body('year').optional().custom((value) => [1, 2, 3, 4, 5, 'First year', 'Second year', 'Third year', 'Fourth year', 'Fifth year'].includes(value)).withMessage("Year must be valid"),
    body().custom((value) => value.academicYear || value.year).withMessage("Academic year is required"),
    body('phoneNumber').isMobilePhone('any').withMessage("Invalid phone number"),
    body('enrollmentNumber').isString().isLength({ min: 5, max: 30 }).withMessage("Invalid enrollment number"),
    body('verificationToken').isString().isLength({ min: 20, max: 128 }).withMessage("Email verification is required")
], validateRequest, register);

router.post("/login", authIpCeiling, loginRateLimit, [
    body('email').custom(isIitrEmail).withMessage("Invalid IITR email address"),
    body('password').isLength({ min: 4, max: 128 }).withMessage("Invalid password")
], validateRequest, login);

router.post('/logout', logout)

router.get('/getProfile',studentAuth,getProfile)

router.post('/uploads/sign', studentAuth, [
  body('kind').isIn(['profilePicture', 'submission']),
], validateRequest, signDirectUpload(['profilePicture', 'submission']))

router.patch('/profile', studentAuth, upload.single('profilePicture'), attachDirectAsset('profilePicture'), [
  body('name').optional().isString().trim().isLength({ min: 2, max: 100 }),
  body('phoneNumber').optional().isMobilePhone('any'),
  body('notificationPreferences').optional().isObject(),
  body('notificationPreferencesJSON').optional().isString().isLength({ max: 200 }),
  body('notificationPreferences.email').optional().isBoolean(),
  body('notificationPreferences.inApp').optional().isBoolean(),
], validateRequest, updateProfile)

router.post('/changePassword', studentAuth, [
  body('currentPassword').isString().isLength({ min: 1, max: 128 }),
  body('newPassword').isLength({ min: 10, max: 128 }).custom(fitsBcrypt).withMessage("Password must be 10–72 bytes long"),
], validateRequest, changePassword)

router.get('/getSessions', publicCache(60), getAllSessions)

router.get('/getSession', publicCache(60), [
  query('sessionId').isMongoId().withMessage("Invalid session ID")
], validateRequest, getSession);

router.get('/getAllClubs', publicCache(300), getAllClubs)

router.get('/getClub', publicCache(300), [
  query('clubId').isMongoId().withMessage("Invalid club ID")
], validateRequest, getClub);

router.get('/getEvents', optionalStudentAuth, catalogueCache(60), getAllEvents)

router.get('/getEvent', optionalStudentAuth, catalogueCache(60), [
  query('eventId').isMongoId().withMessage("Invalid event ID")
], validateRequest, getEvent);

router.get('/getClubEvents', publicCache(60), [
  query('clubId').isMongoId().withMessage("Invalid club ID")
], validateRequest, getClubEvents)

router.get('/getClubSessions', publicCache(60), [
  query('clubId').isMongoId().withMessage("Invalid club ID")
], validateRequest, getClubSessions)

router.get('/getDashboard', optionalStudentAuth, catalogueCache(60), getDashBoard)

router.post('/registerEvent',studentAuth,[
  body('eventId').isMongoId().withMessage("Invalid event ID"),
  body('verticalId').optional().isMongoId().withMessage("Invalid vertical ID")
], validateRequest, registerEvent)

router.post('/events/:eventId/application', studentAuth, upload.submissionUpload.array('files', 5), attachDirectAssets('submission'), [
  param('eventId').isMongoId(),
  body('verticalId').optional().isMongoId().withMessage('Invalid vertical ID'),
  body('answersJSON').optional().isString().isLength({ max: 50000 }),
  body('fileKeysJSON').optional().isString().isLength({ max: 2000 }),
], validateRequest, submitInitialApplication)

router.get('/getEventDetails',studentAuth,[
  query('eventId').isMongoId().withMessage("Invalid event ID")
], validateRequest, getEventDetails)

router.post('/addMemberOffer', studentAuth, [
  body('registrationId').isMongoId().withMessage("Invalid application ID"),
  body('memberEmail').custom(isIitrEmail).withMessage("Invalid member email").bail().normalizeEmail().isLength({ max: 254 })
], validateRequest, addMemberOffer);

router.post('/acceptMemberOffer', studentAuth, [
  body('registrationId').isMongoId().withMessage("Invalid application ID")
], validateRequest, acceptMemberOffer)

router.post('/declineMemberOffer', studentAuth, [
  body('registrationId').isMongoId(),
], validateRequest, declineMemberOffer)

router.post('/cancelMemberOffer', studentAuth, [
  body('registrationId').isMongoId(),
  body('memberEmail').custom(isIitrEmail).normalizeEmail(),
], validateRequest, cancelMemberOffer)

router.post('/removeTeamMember', studentAuth, [
  body('registrationId').isMongoId(),
  body('memberId').isMongoId(),
], validateRequest, removeTeamMember)

router.post('/leaveTeam', studentAuth, [
  body('registrationId').isMongoId(),
], validateRequest, leaveTeam)

router.post('/transferCaptain', studentAuth, [
  body('registrationId').isMongoId(),
  body('memberId').isMongoId(),
], validateRequest, transferCaptain)

router.post('/unregisterAsCaptain',studentAuth, [
  body('registrationId').isMongoId().withMessage("Invalid application ID")
], validateRequest, unregisteredAsCaptain)

router.post('/addTeamName',studentAuth, [
  body('registrationId').isMongoId().withMessage("Invalid application ID"),
  body('teamName').isString().trim().isLength({ min: 2, max: 80 }).withMessage("Invalid team name")
], validateRequest, addTeamName)

router.get('/myApplications', studentAuth, getMyApplications)
router.get('/notifications', studentAuth, getNotifications)
router.get('/notifications/unread-count', studentAuth, getUnreadNotificationCount)
router.post('/notifications/read', studentAuth, [body('notificationId').isMongoId()], validateRequest, markNotificationRead)
router.post('/notifications/read-all', studentAuth, markAllNotificationsRead)

const validInstallationId = (value) => /^[A-Za-z0-9_-]{10,200}$/.test(String(value || ""));
router.put('/push/registration', studentAuth, [
  body('installationId').custom(validInstallationId).withMessage('Invalid Firebase installation ID'),
], validateRequest, registerPushInstallation)
router.delete('/push/registration', studentAuth, [
  body('installationId').custom(validInstallationId).withMessage('Invalid Firebase installation ID'),
], validateRequest, unregisterPushInstallation)
router.get('/push/registration', studentAuth, [
  query('installationId').custom(validInstallationId).withMessage('Invalid Firebase installation ID'),
], validateRequest, getPushInstallationStatus)

router.get('/sessionRsvp', studentAuth, [query('sessionId').isMongoId()], validateRequest, getSessionRsvp)
router.post('/sessionRsvp', studentAuth, [body('sessionId').isMongoId()], validateRequest, rsvpSession)
router.post('/sessionRsvp/cancel', studentAuth, [body('sessionId').isMongoId()], validateRequest, cancelSessionRsvp)

router.get('/events/:eventId/workflow', studentAuth, [
  param('eventId').isMongoId(),
], validateRequest, getMyEventWorkflow)

router.put('/events/:eventId/rounds/:roundId/submission', studentAuth, upload.submissionUpload.array('files', 5), attachDirectAssets('submission'), [
  param('eventId').isMongoId(),
  param('roundId').isMongoId(),
  body('candidateId').isMongoId(),
  body('answersJSON').optional().isString().isLength({ max: 50000 }),
  body('fileKeysJSON').optional().isString().isLength({ max: 2000 }),
], validateRequest, submitRoundWork)

router.post('/forgotPassword',[
  body("email").custom(isIitrEmail).withMessage("Invalid IITR email address"),
  body("newPassword").isLength({ min: 10, max: 128 }).custom(fitsBcrypt).withMessage("Password must be 10–72 bytes long"),
  body("resetToken").isString().isLength({ min: 20, max: 128 }).withMessage("Reset verification is required")
], validateRequest, forgotPassword)

module.exports = router;
