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
} = require("../controllers/student.controllers");
const { studentAuth } = require("../middlewares/auth.middlewares");
const router = express.Router();

router.post(
  "/sendOtp",
  [body("email").isEmail().withMessage("Invalid email address")],
  sendOtp
);

router.post("/verifyOtp",[
    body("email").isEmail().withMessage("Invalid email address"),
    body("otp").isString().withMessage("Invalid OTP")
], verifyOtp);

router.post("/register",[
    body('email').isEmail().withMessage("Invalid email address"),
    body('password').isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    body('name').isString().isLength({ min: 2 }).withMessage("Name must be at least 2 characters long"),
    body('branch').isString().isLength({ min: 2 }).withMessage("Branch must be at least 2 characters long"),
    body('year').isString().isLength({ min: 1 }).withMessage("Year must be a valid string"),
    body('phoneNumber').isString().isLength({ min: 10 }).withMessage("Invalid phone number")
], register);

router.post("/login",[
    body('email').isEmail().withMessage("Invalid email address"),
    body('password').isLength({ min: 6 }).withMessage("Password must be at least 6 characters long")
], login);

router.get('/getProfile',studentAuth,getProfile)

router.get('/getSessions',studentAuth,getAllSessions)

router.get('/getSession',studentAuth,[
  query('sessionId').isString().withMessage("Invalid session ID")
], getSession);

router.get('/getAllClubs',studentAuth, getAllClubs)

router.get('/getClub',studentAuth,[
  query('clubId').isString().withMessage("Invalid club ID")
],getClub);

router.get('/getEvents',studentAuth, getAllEvents)

router.get('/getEvent',studentAuth,[
  query('eventId').isString().withMessage("Invalid event ID")
],getEvent);

router.get('/getClubEvents',studentAuth,[
  query('clubId').isString().withMessage("Invalid club ID")
],getClubEvents)

router.get('/getClubSessions',studentAuth,[
  query('clubId').isString().withMessage("Invalid club ID")
],getClubSessions)

router.get('/getDashboard',studentAuth, getDashBoard)

router.post('/registerEvent',studentAuth,[
  body('eventId').isString().withMessage("Invalid event ID")
],registerEvent)

router.get('/getEventDetails',studentAuth,[
  query('eventId').isString().withMessage("Invalid event ID")
],getEventDetails)

router.post('/addMemberOffer', studentAuth, [
  body('eventId').isString().withMessage("Invalid event ID"),
  body('memberEmail').isEmail().withMessage("Invalid member email")
], addMemberOffer);

router.post('/acceptMemberOffer', studentAuth, [
  body('eventId').isString().withMessage("Invalid event ID"),
  body('studentId').isString().withMessage("Invalid student ID")
], acceptMemberOffer)

module.exports = router;
