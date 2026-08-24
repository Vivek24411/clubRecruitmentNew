const test = require("node:test");
const assert = require("node:assert/strict");
const { firebaseConfigured } = require("../src/services/firebaseMessaging.services");
const { pushAppOrigin } = require("../src/controllers/push.controllers");

const KEYS = ["PUSH_NOTIFICATIONS_ENABLED", "FIREBASE_PROJECT_ID", "FIREBASE_SERVICE_ACCOUNT_BASE64"];

test("Firebase push configuration rejects malformed or mismatched service accounts", () => {
  const previous = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  try {
    process.env.PUSH_NOTIFICATIONS_ENABLED = "true";
    process.env.FIREBASE_PROJECT_ID = "expected-project";
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = Buffer.from(JSON.stringify({ project_id: "expected-project" })).toString("base64");
    assert.equal(firebaseConfigured(), true);

    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = Buffer.from(JSON.stringify({ project_id: "different-project" })).toString("base64");
    assert.equal(firebaseConfigured(), false);

    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = "not-valid-json";
    assert.equal(firebaseConfigured(), false);
  } finally {
    for (const key of KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("push registrations accept only the configured official student origin", () => {
  const previous = process.env.STUDENT_APP_ORIGIN;
  try {
    process.env.STUDENT_APP_ORIGIN = "https://discovr.iitr.ac.in";
    assert.equal(pushAppOrigin({ get: () => "https://discovr.iitr.ac.in" }), "https://discovr.iitr.ac.in");
    assert.equal(pushAppOrigin({ get: () => "https://discovr.devx6.live" }), null);
    assert.equal(pushAppOrigin({ get: () => "" }), null);
  } finally {
    if (previous === undefined) delete process.env.STUDENT_APP_ORIGIN;
    else process.env.STUDENT_APP_ORIGIN = previous;
  }
});
