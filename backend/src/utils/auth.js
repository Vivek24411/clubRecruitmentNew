const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const ISSUER = "club-recruitment";
const SESSION_TTL = process.env.SESSION_TTL || "2h";
const COOKIE_MAX_AGE_MS = Number(process.env.SESSION_MAX_AGE_MS || 2 * 60 * 60 * 1000);

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
      expiresIn: SESSION_TTL,
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
    maxAge: COOKIE_MAX_AGE_MS,
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

module.exports = {
  clearSessionCookie,
  getSessionToken,
  setSessionCookie,
  signSession,
  verifySession,
};
