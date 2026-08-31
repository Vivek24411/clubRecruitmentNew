const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const ISSUER = "club-recruitment";
const DEFAULT_SESSION_TTLS = { student: "2d", club: "2d", admin: "8h" };
const DEFAULT_COOKIE_AGES = {
  student: 2 * 24 * 60 * 60 * 1000,
  club: 2 * 24 * 60 * 60 * 1000,
  admin: 8 * 60 * 60 * 1000,
};

function sessionTtl(role) {
  return process.env[`${role.toUpperCase()}_SESSION_TTL`]
    || process.env.SESSION_TTL
    || DEFAULT_SESSION_TTLS[role];
}

function cookieMaxAge(role) {
  return Number(
    process.env[`${role.toUpperCase()}_SESSION_MAX_AGE_MS`]
    || process.env.SESSION_MAX_AGE_MS
    || DEFAULT_COOKIE_AGES[role]
  );
}

const cookieNames = {
  student: "student_session",
  club: "club_session",
  admin: "admin_session",
};

function signSession({ subject, role, version = 0 }) {
  return jwt.sign(
    { role, ver: version },
    process.env.JWT_SECRET,
    {
      algorithm: "HS256",
      subject: String(subject),
      issuer: ISSUER,
      audience: role,
      expiresIn: sessionTtl(role),
      jwtid: crypto.randomUUID(),
    }
  );
}

function verifySession(token, role) {
  return jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ["HS256"],
    issuer: ISSUER,
    audience: role,
  });
}

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};

  return header.split(";").reduce((cookies, item) => {
    const separator = item.indexOf("=");
    if (separator === -1) return cookies;
    const key = item.slice(0, separator).trim();
    const value = item.slice(separator + 1).trim();
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
    return cookies;
  }, {});
}

function getSessionToken(req, role) {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith("Bearer ")) {
    const candidate = authorization.slice(7).trim();
    if (candidate && candidate !== "null" && candidate !== "undefined") {
      return candidate;
    }
  }
  return parseCookies(req)[cookieNames[role]];
}

function setSessionCookie(res, role, token) {
  const production = process.env.NODE_ENV === "production";
  res.cookie(cookieNames[role], token, {
    httpOnly: true,
    secure: production,
    sameSite: production ? "none" : "lax",
    maxAge: cookieMaxAge(role),
    path: "/",
  });
}

function clearSessionCookie(res, role) {
  const production = process.env.NODE_ENV === "production";
  res.clearCookie(cookieNames[role], {
    httpOnly: true,
    secure: production,
    sameSite: production ? "none" : "lax",
    path: "/",
  });
}

/**
 * Browser clients authenticate exclusively with the HttpOnly session cookie.
 * A bearer token is returned only to the native student app, where it is kept
 * in the OS credential store and cookies are not a dependable session
 * transport. Requiring the native marker and the absence of an Origin keeps a
 * browser/XSS request from opting itself back into a JavaScript-readable JWT.
 */
function nativeSessionPayload(req, role, token) {
  if (role !== "student") return {};
  if (req.headers.origin || req.headers["x-discovr-client"] !== "mobile") return {};
  return { token };
}

module.exports = {
  clearSessionCookie,
  getSessionToken,
  nativeSessionPayload,
  setSessionCookie,
  signSession,
  verifySession,
};
