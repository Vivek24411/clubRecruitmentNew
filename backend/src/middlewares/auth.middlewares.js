const clubModel = require("../models/club.model");
const studentModel = require("../models/student.model");
const { syncAcademicState } = require("../services/academic.services");
const { getPlatformSettingsCached } = require("../services/platformConfiguration.services");
const { getSessionToken, verifySession } = require("../utils/auth");
const { getPrincipal, putPrincipal } = require("../services/authPrincipalCache.services");

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
    const club = await getPrincipal({ role: "club", id: decoded.sub, version: decoded.ver, model: clubModel });
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
    const student = await getPrincipal({ role: "student", id: decoded.sub, version: decoded.ver, model: studentModel });
    if (!student || student.status !== "active" || student.tokenVersion !== decoded.ver) {
      return unauthorized(res, "Student session is no longer active");
    }
    const settings = await getPlatformSettingsCached();
    await syncAcademicState(student, settings);
    putPrincipal("student", student, decoded.ver);
    req.student = student;
    return next();
  } catch {
    return unauthorized(res, "Session expired or invalid");
  }
};

/**
 * Adds student context to public catalogue requests when a valid session is
 * present. Missing, expired, or revoked sessions remain anonymous so a stale
 * browser cookie never prevents somebody from browsing public content.
 */
module.exports.optionalStudentAuth = async (req, _res, next) => {
  const token = getSessionToken(req, "student");
  if (!token) return next();

  try {
    const decoded = verifySession(token, "student");
    const student = await getPrincipal({ role: "student", id: decoded.sub, version: decoded.ver, model: studentModel });
    if (student && student.status === "active" && student.tokenVersion === decoded.ver) {
      const settings = await getPlatformSettingsCached();
      await syncAcademicState(student, settings);
      putPrincipal("student", student, decoded.ver);
      req.student = student;
    }
  } catch {
    // Public reads intentionally continue as an anonymous visitor.
  }
  return next();
};
