const express = require("express");
const { body, query } = require("express-validator");
const { login } = require("../controllers/student.controllers");
const router = express.Router();

router.post("/login", [
  body("email").isEmail(),
  body("password").isLength({ min: 5 }),
], login);

module.exports = router;