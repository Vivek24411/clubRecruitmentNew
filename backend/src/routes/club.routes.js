const express = require("express");
const router = express.Router();
const { body, query } = require("express-validator");
const { clubLogin, addSession, getProfile, updateProfile, getSessions, getSession, addEvent, getEvents, getEvent, getDashBoard, getEventsRegisteredStudents, finalizeStudent, scheduleInterview, selectStudentForRound } = require("../controllers/club.contollers");
const { clubAuth } = require("../middlewares/auth.middlewares");
const upload = require("../middlewares/upload");

router.post(
  "/login",
  [
    body("userName").isString().notEmpty(),
    body("password").isLength({ min: 5 }),
  ],
  clubLogin
);

router.post(
  "/addSession",
  clubAuth,
  [
    body("title").isString().notEmpty(),
    body("shortDescription").isString().notEmpty(),
    body("date").isString().notEmpty(),
    body("time").isString().notEmpty(),
    body("duration")
      .isString()
      .notEmpty()
      .withMessage("Duration must be a positive integer"),
    body("venue").isString().notEmpty(),
  ],
  addSession
);

router.get('/getProfile',clubAuth,getProfile)

router.post('/updateProfile',clubAuth,[

  body("name").isString().optional(),
  body("userName").isString().optional(),
  body("shortDescription").isString().optional(),
  body("longDescription").isString().optional(),
  body("website").isString().optional(),
  body("linkedin").isString().optional(),
  body("instagram").isString().optional(),
  body("achivements").isString().optional(),
  body("recruitmentMethods").isString().optional(),
  body("contactEmail").isEmail().optional(),
  body("contactPhone").isString().optional(),
],updateProfile)

router.get('/getSessions',clubAuth,getSessions)

router.get('/getSession', clubAuth, [
  query('sessionId').isString().notEmpty().withMessage('sessionId is required')
],getSession)

router.post('/addEvent',clubAuth,
  upload.single('eventBanner'),[
  body("title").isString().notEmpty(),
  body("shortDescription").isString().notEmpty(),
  body("longDescription").isString().notEmpty(),
  body("registerationDeadline").isString().optional(),
  body("maxParticipants").isNumeric().optional(),
  // Remove array validation as we're now handling them differently
  body('numberOfRounds').isNumeric().optional(),
  body('eligibility').isString().optional(),
  body('roundDetailsJSON').optional(),
  // Add custom validation for roundDetailsJSON to ensure it's valid JSON if provided
  body('roundDetailsJSON').optional().custom((value) => {
    if (!value) return true;
    try {
      JSON.parse(value);
      return true;
    } catch (e) {
      throw new Error('roundDetailsJSON must be valid JSON');
    }
  })
],addEvent)

router.get('/getEvents', clubAuth,getEvents)

router.get('/getEvent', clubAuth, [
  query('eventId').isString().notEmpty().withMessage('eventId is required')
],getEvent)

router.get('/getDashBoard', clubAuth,getDashBoard)

router.get('/getEventsRegisteredStudents', clubAuth,[
  query('eventId').isString().notEmpty().withMessage('eventId is required')
],getEventsRegisteredStudents)

router.post('/finalizeStudent', clubAuth,[
  body('eventId').isString().notEmpty().withMessage('eventId is required'),
  body('studentId').isString().notEmpty().withMessage('studentId is required'),
],finalizeStudent)

router.post('/scheduleInterview', clubAuth,[
  body('eventId').isString().notEmpty().withMessage('eventId is required'),
  body('studentId').isString().notEmpty().withMessage('studentId is required'),
  body('roundNumber').isNumeric().notEmpty().withMessage('roundNumber is required'),
  body('roundDate').isString().notEmpty().withMessage('roundDate is required'),
],scheduleInterview)

router.post('/selectStudentForRound', clubAuth,[
  body('eventId').isString().notEmpty().withMessage('eventId is required'),
  body('studentId').isString().notEmpty().withMessage('studentId is required'),
  body('roundNumber').isNumeric().notEmpty().withMessage('roundNumber is required'),
],selectStudentForRound)


module.exports = router;
