const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";

const { getSessionToken, signSession, verifySession } = require("../src/utils/auth");
const { checkEmailDomain } = require("../src/services/student.services");
const { requireTrustedOrigin } = require("../src/middlewares/security");
const rateLimit = require("../src/middlewares/rateLimit");

test("session tokens are role-bound and carry the revocation version", () => {
  const token = signSession({ subject: "student-id", role: "student", version: 3 });
  const payload = verifySession(token, "student");
  assert.equal(payload.sub, "student-id");
  assert.equal(payload.ver, 3);
  assert.throws(() => verifySession(token, "club"));
});

test("cookie auth is used when a legacy client sends Bearer undefined", () => {
  const req = { headers: { authorization: "Bearer undefined", cookie: "student_session=real-token" } };
  assert.equal(getSessionToken(req, "student"), "real-token");
});

test("college email validation requires the exact IITR domain", () => {
  assert.equal(checkEmailDomain("student@iitr.ac.in"), true);
  assert.equal(checkEmailDomain("student@evil-iitr.ac.in"), false);
  assert.equal(checkEmailDomain("student@example.com"), false);
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
