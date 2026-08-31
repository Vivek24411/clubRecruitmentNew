const assert = require("node:assert/strict");
const test = require("node:test");

process.env.JWT_SECRET ||= "test-secret-with-sufficient-entropy-for-sessions";

const { nativeSessionPayload, setSessionCookie } = require("../src/utils/auth");

test("browser responses never expose a JavaScript-readable session token", () => {
  assert.deepEqual(nativeSessionPayload({ headers: { origin: "https://discovr.iitr.ac.in" } }, "student", "secret"), {});
  assert.deepEqual(nativeSessionPayload({ headers: { "x-discovr-client": "mobile", origin: "https://discovr.iitr.ac.in" } }, "student", "secret"), {});
  assert.deepEqual(nativeSessionPayload({ headers: {} }, "club", "secret"), {});
  assert.deepEqual(nativeSessionPayload({ headers: {} }, "admin", "secret"), {});
});

test("only an originless native student request receives a bearer token", () => {
  assert.deepEqual(nativeSessionPayload({ headers: { "x-discovr-client": "mobile" } }, "student", "secret"), { token: "secret" });
});

test("web session cookie is HttpOnly with a bounded lifetime", () => {
  const calls = [];
  setSessionCookie({ cookie: (...args) => calls.push(args) }, "student", "secret");
  assert.equal(calls.length, 1);
  const [name, value, options] = calls[0];
  assert.equal(name, "student_session");
  assert.equal(value, "secret");
  assert.equal(options.httpOnly, true);
  assert.equal(options.path, "/");
  assert.ok(options.maxAge > 0);
});
