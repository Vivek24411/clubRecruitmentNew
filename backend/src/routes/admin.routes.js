const express = require("express");
const { body, param, query } = require("express-validator");
const { login, logout, getProfile, addClub, getAllSessions, getSessionDetail, getAllClubs, getClubDetail, getAllEvents, getEventDetail, getDashBoard, getStudents, updateStudentStatus, updateStudentAcademics, updateClubStatus, updateClubDetails, resetClubPassword, moderateEvent, moderateSession, getAuditLogs, getSettings, updateSettings } = require("../controllers/admin.controllers");
const { adminAuth } = require("../middlewares/auth.middlewares");
const router = express.Router();
const upload = require("../middlewares/upload");
const { attachDirectAsset, signDirectUpload } = require("../middlewares/directUpload");
const rateLimit = require("../middlewares/rateLimit");
const validateRequest = require("../middlewares/validateRequest");
const fitsBcrypt = (value) => Buffer.byteLength(String(value), "utf8") <= 72;

const loginRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, keyPrefix: "admin-login", persistent: true, keyGenerator: rateLimit.bodyIdentifier("email") });
const uploadSignRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, keyPrefix: "admin-upload-sign", persistent: true, keyGenerator: rateLimit.sessionOrIp });

router.post("/login", loginRateLimit, [
  body("email").isEmail().normalizeEmail().isLength({ max: 254 }),
  body("password").isLength({ min: 5, max: 128 }),
], validateRequest, login);

router.post('/logout', logout)

router.get('/getProfile',adminAuth,getProfile)

router.post('/uploads/sign', adminAuth, uploadSignRateLimit, [
  body('kind').equals('clubLogo'),
], validateRequest, signDirectUpload(['clubLogo']))

router.post("/addClub",adminAuth,upload.single('clubLogo'),attachDirectAsset('clubLogo'),[
  body("name").isString().trim().isLength({ min: 2, max: 150 }).withMessage("Club name is required"),
  body("userName").isString().trim().isLength({ min: 1, max: 80 }).withMessage("Username is required"),
  body("password").isLength({ min: 10, max: 128 }).custom(fitsBcrypt).withMessage("Password must be 10–72 bytes long"),
  body("accountEmail").isEmail().normalizeEmail().isLength({ max: 254 }),
  body("contactEmail").optional({ checkFalsy: true }).isEmail().normalizeEmail().isLength({ max: 254 }),
  body("category").isString().trim().matches(/^[a-z0-9_-]+$/).isLength({ min: 2, max: 50 }),
  body("useAccountEmailForContact").optional().isBoolean(),
], validateRequest, addClub);

router.get('/getAllSessions',adminAuth,getAllSessions)

router.get('/getSessionDetail', adminAuth,[
  query("sessionId").isMongoId().withMessage("Session ID is required"),
], validateRequest, getSessionDetail)

router.get('/getAllClubs', adminAuth,getAllClubs )

router.get('/getClubDetail', adminAuth,[
  query("clubId").isMongoId().withMessage("Club ID is required"),
], validateRequest, getClubDetail)

router.get('/getAllEvents',adminAuth,getAllEvents)

router.get('/getEventDetail',adminAuth,[
  query("eventId").isMongoId().withMessage("Event ID is required"),
], validateRequest, getEventDetail)

router.get('/getDashBoard',adminAuth,getDashBoard)

router.get('/students', adminAuth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString().isLength({ max: 100 }),
], validateRequest, getStudents)

router.patch('/students/:studentId/status', adminAuth, [
  param('studentId').isMongoId(),
  body('status').isIn(['active', 'suspended']),
], validateRequest, updateStudentStatus)

router.patch('/students/:studentId/academics', adminAuth, [
  param('studentId').isMongoId(),
  body('programme').isIn(['undergraduate', 'mtech', 'msc', 'mba', 'phd']),
  body('branch').isString().trim().isLength({ min: 2, max: 100 }),
  body('academicYear').isInt({ min: 1, max: 5 }).toInt(),
], validateRequest, updateStudentAcademics)

router.patch('/clubs/:clubId/status', adminAuth, [
  param('clubId').isMongoId(),
  body('status').isIn(['active', 'suspended']),
], validateRequest, updateClubStatus)

router.patch('/clubs/:clubId/details', adminAuth, [
  param('clubId').isMongoId(),
  body('accountEmail').optional().isEmail().normalizeEmail().isLength({ max: 254 }),
  body('contactEmail').optional({ checkFalsy: true }).isEmail().normalizeEmail().isLength({ max: 254 }),
  body('category').optional().isString().trim().matches(/^[a-z0-9_-]+$/).isLength({ min: 2, max: 50 }),
  body('useAccountEmailForContact').optional().isBoolean(),
], validateRequest, updateClubDetails)

router.post('/clubs/:clubId/reset-password', adminAuth, [
  param('clubId').isMongoId(),
  body('newPassword').isLength({ min: 10, max: 128 }).custom(fitsBcrypt).withMessage("Password must be 10–72 bytes long"),
], validateRequest, resetClubPassword)

router.patch('/events/:eventId/status', adminAuth, [
  param('eventId').isMongoId(),
  body('status').isIn(['draft', 'published', 'closed', 'archived', 'cancelled']),
], validateRequest, moderateEvent)

router.patch('/sessions/:sessionId/status', adminAuth, [
  param('sessionId').isMongoId(),
  body('status').isIn(['draft', 'published', 'cancelled', 'completed', 'archived']),
], validateRequest, moderateSession)

router.get('/audit-logs', adminAuth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('action').optional().isString().isLength({ max: 100 }),
], validateRequest, getAuditLogs)

router.get('/settings', adminAuth, getSettings)
router.patch('/settings', adminAuth, [
  body('registrationEnabled').optional().isBoolean(),
  body('maintenanceMessage').optional().isString().isLength({ max: 500 }),
  body('recruitmentCycle').optional().isObject().custom((cycle) => {
    if (cycle.startAt && cycle.endAt && new Date(cycle.startAt) >= new Date(cycle.endAt)) {
      throw new Error('Recruitment cycle end must be after its start');
    }
    return true;
  }),
  body('recruitmentCycle.name').optional().isString().isLength({ max: 100 }),
  body('recruitmentCycle.status').optional().isIn(['draft', 'open', 'closed']),
  body('recruitmentCycle.startAt').optional({ nullable: true }).isISO8601(),
  body('recruitmentCycle.endAt').optional({ nullable: true }).isISO8601(),
  body('academicConfiguration').optional().isObject(),
  body('academicConfiguration.rolloverMonth').optional().isInt({ min: 1, max: 12 }),
  body('academicConfiguration.rolloverDay').optional().isInt({ min: 1, max: 28 }),
  body('academicConfiguration.branches').optional().isArray({ max: 100 }),
  body('academicConfiguration.branches.*.name').optional().isString().trim().isLength({ min: 2, max: 100 }),
  body('academicConfiguration.branches.*.durationYears').optional().isInt().isIn([4, 5]),
  body('clubTypes').optional().isArray({ min: 4, max: 30 }),
  body('clubTypes.*').optional().isString().trim().matches(/^[a-z0-9_-]+$/).isLength({ min: 2, max: 50 }),
], validateRequest, updateSettings)


module.exports = router;
