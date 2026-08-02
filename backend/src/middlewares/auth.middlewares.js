const clubModel = require("../models/club.model");
const studentModel = require("../models/student.model");
const { getSessionToken, verifySession } = require("../utils/auth");

function unauthorized(res, msg = "Authentication required") {
  return res.status(401).json({ success: false, msg });
}

module.exports.adminAuth = async (req, res, next) => {
  const token = getSessionToken(req, "admin");
  if (!token) return unauthorized(res);

  try {
    const decoded = verifySession(token, "admin");
    if (decoded.sub !== process.env.ADMIN_EMAIL.trim().toLowerCase()) return unauthorized(res);
    req.admin = { email: decoded.sub, role: "admin" };
    return next();
  } catch {
    return unauthorized(res, "Session expired or invalid");
  }
};

module.exports.clubAuth = async (req, res, next) => {
  const token = getSessionToken(req, "club");
  if (!token) return unauthorized(res);

  try {
    const decoded = verifySession(token, "club");
    const club = await clubModel.findById(decoded.sub).select("+tokenVersion");
    if (!club || club.status === "suspended" || club.tokenVersion !== decoded.ver) {
      return unauthorized(res, "Club session is no longer active");
    }
    req.club = club;
    return next();
  } catch {
    return unauthorized(res, "Session expired or invalid");
  }
};

module.exports.studentAuth = async (req, res, next) => {
  const token = getSessionToken(req, "student");
  if (!token) return unauthorized(res);

  try {
    const decoded = verifySession(token, "student");
    const student = await studentModel.findById(decoded.sub).select("+tokenVersion");
    if (!student || student.status === "suspended" || student.tokenVersion !== decoded.ver) {
      return unauthorized(res, "Student session is no longer active");
    }
    req.student = student;
    return next();
  } catch {
    return unauthorized(res, "Session expired or invalid");
  }
};
