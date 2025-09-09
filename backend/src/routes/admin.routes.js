const express = require("express");
const { body, query } = require("express-validator");
const { login, getProfile, addClub, getAllSessions, getSessionDetail, getAllClubs, getClubDetail, getAllEvents, getEventDetail, getDashBoard } = require("../controllers/admin.controllers");
const { adminAuth } = require("../middlewares/auth.middlewares");
const router = express.Router();

router.post("/login", [
  body("email").isEmail(),
  body("password").isLength({ min: 5 }),
], login);

router.get('/getProfile',adminAuth,getProfile)

router.post("/addClub",adminAuth,[
  body("name").isString().notEmpty().withMessage("Club name is required"),
  body("userName").isString().notEmpty().withMessage("Username is required"),
  body("password").isLength({ min: 5 }).withMessage("Password must be at least 5 characters long"),
], addClub);

router.get('/getAllSessions',adminAuth,getAllSessions)

router.get('/getSessionDetail', adminAuth,[
  query("sessionId").isString().notEmpty().withMessage("Session ID is required"),
],getSessionDetail)

router.get('/getAllClubs', adminAuth,getAllClubs )

router.get('/getClubDetail', adminAuth,[
  query("clubId").isString().notEmpty().withMessage("Club ID is required"),
],getClubDetail)

router.get('/getAllEvents',adminAuth,getAllEvents)

router.get('/getEventDetail',adminAuth,[
  query("eventId").isString().notEmpty().withMessage("Event ID is required"),
],getEventDetail)

router.get('/getDashBoard',adminAuth,getDashBoard)


module.exports = router;