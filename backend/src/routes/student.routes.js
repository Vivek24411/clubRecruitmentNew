const express = require("express");
const { query, body } = require("express-validator");
const {
  register,
  verifyOtp,
  sendOtp,
  login,
} = require("../controllers/student.controllers");
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
    body('year').isInt({ min: 1 }).withMessage("Year must be a positive integer")
], register);

router.post("/login",[
    body('email').isEmail().withMessage("Invalid email address"),
    body('password').isLength({ min: 6 }).withMessage("Password must be at least 6 characters long")
], login);

module.exports = router;
