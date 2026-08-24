const test = require("node:test");
const assert = require("node:assert/strict");
const { firebaseConfigured } = require("../src/services/firebaseMessaging.services");

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
