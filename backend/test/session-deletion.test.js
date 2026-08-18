const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const sessionModel = require("../src/models/session.model");
const sessionRsvpModel = require("../src/models/sessionRsvp.model");
const notificationModel = require("../src/models/notification.model");
const jobModel = require("../src/models/job.model");
const auditLogModel = require("../src/models/auditLog.model");
const { deleteSession } = require("../src/controllers/club.contollers");

test("confirmed session deletion cascades through RSVP and attendance activity", async () => {
  const sessionId = new mongoose.Types.ObjectId();
  const clubId = new mongoose.Types.ObjectId();
  const deletedCollections = new Set();
  const originals = new Map();
  const replace = (target, key, value) => {
    originals.set(`${target.modelName || "mongoose"}:${key}`, { target, key, value: target[key] });
    target[key] = value;
  };
  const session = {
    _id: sessionId,
    clubId,
    title: "Temporary test session",
    status: "published",
    sessionThumbnailPublicId: "",
    async save() { assert.equal(this.status, "archived"); },
  };

  replace(sessionModel, "findOne", async () => session);
  replace(sessionModel, "deleteOne", async () => ({ deletedCount: 1 }));
  for (const [name, model] of [
    ["rsvps", sessionRsvpModel],
    ["notifications", notificationModel],
    ["jobs", jobModel],
  ]) {
    replace(model, "deleteMany", async () => {
      deletedCollections.add(name);
      return { deletedCount: 1 };
    });
  }
  let audit;
  replace(auditLogModel, "create", async (entry) => { audit = entry; return entry; });
  replace(mongoose, "startSession", async () => ({
    async withTransaction(callback) { await callback(); },
    async endSession() {},
  }));

  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  try {
    await deleteSession(
      { params: { sessionId: String(sessionId) }, club: { _id: clubId }, body: { confirmation: session.title } },
      res,
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(deletedCollections, new Set(["rsvps", "notifications", "jobs"]));
    assert.equal(audit.action, "session.delete_with_activity");
    assert.equal(audit.metadata.title, session.title);
  } finally {
    for (const { target, key, value } of originals.values()) target[key] = value;
  }
});
