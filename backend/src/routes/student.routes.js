const express = require("express");
const { query, body } = require("express-validator");
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
  getMyApplications,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  rsvpSession,
  cancelSessionRsvp,
  getSessionRsvp,
} = require("../controllers/student.controllers");
const { studentAuth } = require("../middlewares/auth.middlewares");
const rateLimit = require("../middlewares/rateLimit");
const validateRequest = require("../middlewares/validateRequest");
const { checkEmailDomain } = require("../services/student.services");
const router = express.Router();
const fitsBcrypt = (value) => Buffer.byteLength(String(value), "utf8") <= 72;
const isIitrEmail = (value) => checkEmailDomain(value);

const otpRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, keyPrefix: "otp", persistent: true });
const verifyRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: "otp-verify", persistent: true });
const loginRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: "student-login", persistent: true });

router.post(
  "/sendOtp",
  otpRateLimit,
  [
    body("email").custom(isIitrEmail).withMessage("Invalid IITR email address").bail().normalizeEmail().isLength({ max: 254 }),
    body("purpose").optional().isIn(["signup", "password_reset"]),
  ],
  validateRequest,
  sendOtp
);

router.post("/verifyOtp", verifyRateLimit, [
    body("email").custom(isIitrEmail).withMessage("Invalid IITR email address"),
    body("otp").isLength({ min: 6, max: 6 }).isNumeric().withMessage("Invalid OTP"),
    body("purpose").optional().isIn(["signup", "password_reset"]),
], validateRequest, verifyOtp);

router.post("/register",[
    body('email').custom(isIitrEmail).withMessage("Invalid IITR email address"),
    body('password').isLength({ min: 10, max: 128 }).custom(fitsBcrypt).withMessage("Password must be 10–72 bytes long"),
    body('name').isString().trim().isLength({ min: 2, max: 100 }).withMessage("Name must be between 2 and 100 characters"),
    body('branch').isString().trim().isLength({ min: 2, max: 100 }).withMessage("Branch must be between 2 and 100 characters"),
    body('year').isString().trim().isLength({ min: 1, max: 20 }).withMessage("Year must be valid"),
    body('phoneNumber').isMobilePhone('any').withMessage("Invalid phone number"),
    body('enrollmentNumber').isString().isLength({ min: 5, max: 30 }).withMessage("Invalid enrollment number"),
    body('verificationToken').isString().isLength({ min: 20, max: 128 }).withMessage("Email verification is required")
], validateRequest, register);

router.post("/login", loginRateLimit, [
    body('email').custom(isIitrEmail).withMessage("Invalid IITR email address"),
    body('password').isLength({ min: 4, max: 128 }).withMessage("Invalid password")
], validateRequest, login);

router.post('/logout', logout)

router.get('/getProfile',studentAuth,getProfile)

router.patch('/profile', studentAuth, [
  body('name').optional().isString().trim().isLength({ min: 2, max: 100 }),
  body('branch').optional().isString().trim().isLength({ min: 2, max: 100 }),
  body('year').optional().isString().trim().isLength({ min: 1, max: 20 }),
  body('phoneNumber').optional().isMobilePhone('any'),
  body('notificationPreferences').optional().isObject(),
  body('notificationPreferences.email').optional().isBoolean(),
  body('notificationPreferences.inApp').optional().isBoolean(),
], validateRequest, updateProfile)

router.post('/changePassword', studentAuth, [
  body('currentPassword').isString().isLength({ min: 1, max: 128 }),
  body('newPassword').isLength({ min: 10, max: 128 }).custom(fitsBcrypt).withMessage("Password must be 10–72 bytes long"),
], validateRequest, changePassword)

router.get('/getSessions',studentAuth,getAllSessions)

router.get('/getSession',studentAuth,[
  query('sessionId').isMongoId().withMessage("Invalid session ID")
], validateRequest, getSession);

router.get('/getAllClubs',studentAuth, getAllClubs)

router.get('/getClub',studentAuth,[
  query('clubId').isMongoId().withMessage("Invalid club ID")
], validateRequest, getClub);

router.get('/getEvents',studentAuth, getAllEvents)

router.get('/getEvent',studentAuth,[
  query('eventId').isMongoId().withMessage("Invalid event ID")
], validateRequest, getEvent);

router.get('/getClubEvents',studentAuth,[
  query('clubId').isMongoId().withMessage("Invalid club ID")
], validateRequest, getClubEvents)

router.get('/getClubSessions',studentAuth,[
  query('clubId').isMongoId().withMessage("Invalid club ID")
], validateRequest, getClubSessions)

router.get('/getDashboard',studentAuth, getDashBoard)

router.post('/registerEvent',studentAuth,[
  body('eventId').isMongoId().withMessage("Invalid event ID")
], validateRequest, registerEvent)

router.get('/getEventDetails',studentAuth,[
  query('eventId').isMongoId().withMessage("Invalid event ID")
], validateRequest, getEventDetails)

router.post('/addMemberOffer', studentAuth, [
  body('eventId').isMongoId().withMessage("Invalid event ID"),
  body('memberEmail').custom(isIitrEmail).withMessage("Invalid member email").bail().normalizeEmail().isLength({ max: 254 })
], validateRequest, addMemberOffer);

router.post('/acceptMemberOffer', studentAuth, [
  body('eventId').isMongoId().withMessage("Invalid event ID"),
  body('studentId').isMongoId().withMessage("Invalid student ID")
], validateRequest, acceptMemberOffer)

router.post('/declineMemberOffer', studentAuth, [
  body('eventId').isMongoId(),
  body('captainId').isMongoId(),
], validateRequest, declineMemberOffer)

router.post('/cancelMemberOffer', studentAuth, [
  body('eventId').isMongoId(),
  body('memberEmail').custom(isIitrEmail).normalizeEmail(),
], validateRequest, cancelMemberOffer)

router.post('/removeTeamMember', studentAuth, [
  body('eventId').isMongoId(),
  body('memberId').isMongoId(),
], validateRequest, removeTeamMember)

router.post('/leaveTeam', studentAuth, [
  body('eventId').isMongoId(),
], validateRequest, leaveTeam)

router.post('/unregisterAsCaptain',studentAuth, [
  body('eventId').isMongoId().withMessage("Invalid event ID")
], validateRequest, unregisteredAsCaptain)

router.post('/addTeamName',studentAuth, [
  body('eventId').isMongoId().withMessage("Invalid event ID"),
  body('teamName').isString().trim().isLength({ min: 2, max: 80 }).withMessage("Invalid team name")
], validateRequest, addTeamName)

router.get('/myApplications', studentAuth, getMyApplications)
router.get('/notifications', studentAuth, getNotifications)
router.post('/notifications/read', studentAuth, [body('notificationId').isMongoId()], validateRequest, markNotificationRead)
router.post('/notifications/read-all', studentAuth, markAllNotificationsRead)

router.get('/sessionRsvp', studentAuth, [query('sessionId').isMongoId()], validateRequest, getSessionRsvp)
router.post('/sessionRsvp', studentAuth, [body('sessionId').isMongoId()], validateRequest, rsvpSession)
router.post('/sessionRsvp/cancel', studentAuth, [body('sessionId').isMongoId()], validateRequest, cancelSessionRsvp)

router.post('/forgotPassword',[
  body("email").custom(isIitrEmail).withMessage("Invalid IITR email address"),
  body("newPassword").isLength({ min: 10, max: 128 }).custom(fitsBcrypt).withMessage("Password must be 10–72 bytes long"),
  body("resetToken").isString().isLength({ min: 20, max: 128 }).withMessage("Reset verification is required")
], validateRequest, forgotPassword)

module.exports = router;
