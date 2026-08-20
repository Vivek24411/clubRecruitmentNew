const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";

const { getSessionToken, signSession, verifySession } = require("../src/utils/auth");
const { brandedFromEmail, checkEmailDomain } = require("../src/services/student.services");
const { requireTrustedOrigin } = require("../src/middlewares/security");
const rateLimit = require("../src/middlewares/rateLimit");
const otpModel = require("../src/models/otp.model");
const verificationTokenModel = require("../src/models/verificationToken.model");
const clubRouter = require("../src/routes/club.routes");
const studentRouter = require("../src/routes/student.routes");
const { studentAuth } = require("../src/middlewares/auth.middlewares");

test("session tokens are role-bound and carry the revocation version", () => {
  const token = signSession({ subject: "student-id", role: "student", version: 3 });
  const payload = verifySession(token, "student");
  assert.equal(payload.sub, "student-id");
  assert.equal(payload.ver, 3);
  assert.throws(() => verifySession(token, "club"));
});

test("student and club sessions last two days while admin sessions stay shorter", () => {
  const now = Math.floor(Date.now() / 1000);
  const student = verifySession(signSession({ subject: "student-id", role: "student" }), "student");
  const club = verifySession(signSession({ subject: "club-id", role: "club" }), "club");
  const admin = verifySession(signSession({ subject: "admin-id", role: "admin" }), "admin");

  assert.ok(student.exp - now >= (2 * 24 * 60 * 60) - 5);
  assert.ok(club.exp - now >= (2 * 24 * 60 * 60) - 5);
  assert.ok(admin.exp - now <= (8 * 60 * 60) + 5);
});

test("cookie auth is used when a legacy client sends Bearer undefined", () => {
  const req = { headers: { authorization: "Bearer undefined", cookie: "student_session=real-token" } };
  assert.equal(getSessionToken(req, "student"), "real-token");
});

test("bearer auth works when browser privacy settings block the session cookie", () => {
  const req = { headers: { authorization: "Bearer real-token" } };
  assert.equal(getSessionToken(req, "student"), "real-token");
});

test("college email validation accepts any email on the IITR domain", () => {
  assert.equal(checkEmailDomain("vivek_s@es.iitr.ac.in"), true);
  assert.equal(checkEmailDomain("vivek_sh@ec.iitr.ac.in"), true);
  assert.equal(checkEmailDomain("VIVEK_S@ES.IITR.AC.IN"), true);
  assert.equal(checkEmailDomain("student@iitr.ac.in"), true);
  assert.equal(checkEmailDomain("student@es.iitr.ac.in"), true);
  assert.equal(checkEmailDomain("vivek.sharma+clubs@dept.sub.iitr.ac.in"), true);
  assert.equal(checkEmailDomain("unusual..local@es.iitr.ac.in"), true);
  assert.equal(checkEmailDomain("student@evil-iitr.ac.in"), false);
  assert.equal(checkEmailDomain("student@iitr.ac.in.evil.example"), false);
  assert.equal(checkEmailDomain("student@example.com"), false);
  assert.equal(checkEmailDomain("not-an-email-iitr.ac.in"), false);
});

test("outgoing email always uses the Discovr sender name", () => {
  assert.equal(brandedFromEmail(), "Discovr <noreply@expediva.in>");
  assert.equal(brandedFromEmail("noreply@example.com"), "Discovr <noreply@example.com>");
  assert.equal(brandedFromEmail("Recruit IITR <clubs@example.com>"), "Discovr <clubs@example.com>");
});

test("mutating requests reject untrusted browser origins", () => {
  const middleware = requireTrustedOrigin(["https://student.example"]);
  const req = { method: "POST", headers: { origin: "https://evil.example" } };
  const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  middleware(req, res, () => assert.fail("untrusted origin should not continue"));
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
});

test("rate limiter returns 429 after the configured allowance", () => {
  const middleware = rateLimit({ windowMs: 1000, max: 1, keyPrefix: `test-${Date.now()}` });
  const req = { ip: "127.0.0.77", socket: {} };
  const res = { statusCode: 200, headers: {}, set(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  let continued = 0;
  middleware(req, res, () => { continued += 1; });
  middleware(req, res, () => { continued += 1; });
  assert.equal(continued, 1);
  assert.equal(res.statusCode, 429);
  assert.ok(res.headers["Retry-After"]);
});

test("club password recovery has dedicated OTP and verification-token purposes", () => {
  assert.ok(otpModel.schema.path("purpose").enumValues.includes("club_password_reset"));
  assert.ok(verificationTokenModel.schema.path("purpose").enumValues.includes("club_password_reset"));
});

test("club router exposes the complete password recovery flow", () => {
  const routePaths = clubRouter.stack
    .map((layer) => layer.route?.path)
    .filter(Boolean);
  assert.ok(routePaths.includes("/password-reset/request"));
  assert.ok(routePaths.includes("/password-reset/verify"));
  assert.ok(routePaths.includes("/password-reset/complete"));
  assert.ok(routePaths.includes("/changePassword"));
});

test("club router exposes confirmed cascading deletion for sessions", () => {
  const route = clubRouter.stack.find((layer) => layer.route?.path === "/sessions/:sessionId" && layer.route.methods.delete);
  assert.ok(route);
  assert.equal(route.route.methods.delete, true);
});

test("club router exposes confirmed cascading deletion for events", () => {
  const route = clubRouter.stack.find((layer) => layer.route?.path === "/events/:eventId" && layer.route.methods.delete);
  assert.ok(route);
  assert.equal(route.route.methods.delete, true);
});

test("student catalogue reads are public while account data and actions stay protected", () => {
  const routeUsesStudentAuth = (path, method) => {
    const layer = studentRouter.stack.find((item) => item.route?.path === path && item.route?.methods?.[method]);
    assert.ok(layer, `Expected ${method.toUpperCase()} ${path}`);
    return layer.route.stack.some((item) => item.handle === studentAuth);
  };

  [
    "/getDashboard",
    "/getAllClubs",
    "/getClub",
    "/getEvents",
    "/getEvent",
    "/getSessions",
    "/getSession",
    "/getClubEvents",
    "/getClubSessions",
  ].forEach((path) => assert.equal(routeUsesStudentAuth(path, "get"), false, `${path} should be public`));

  ["/getProfile", "/myApplications", "/notifications", "/getEventDetails"]
    .forEach((path) => assert.equal(routeUsesStudentAuth(path, "get"), true, `${path} should require an account`));
  assert.equal(routeUsesStudentAuth("/registerEvent", "post"), true);
  assert.equal(routeUsesStudentAuth("/sessionRsvp", "post"), true);
});
