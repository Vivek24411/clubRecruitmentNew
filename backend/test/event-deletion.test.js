const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const eventModel = require("../src/models/event.model");
const registerationEventModel = require("../src/models/registerationEvent.model");
const roundCandidateModel = require("../src/models/roundCandidate.model");
const roundSubmissionModel = require("../src/models/roundSubmission.model");
const scheduleSlotModel = require("../src/models/scheduleSlot.model");
const scheduleReservationModel = require("../src/models/scheduleReservation.model");
const eventMembershipModel = require("../src/models/eventMembership.model");
const applicationHistoryModel = require("../src/models/applicationHistory.model");
const notificationModel = require("../src/models/notification.model");
const jobModel = require("../src/models/job.model");
const auditLogModel = require("../src/models/auditLog.model");
const { deleteEvent } = require("../src/controllers/club.contollers");

function queryResult(value) {
  return {
    select() { return this; },
    lean() { return Promise.resolve(value); },
  };
}

test("confirmed event deletion cascades through all student activity", async () => {
  const eventId = new mongoose.Types.ObjectId();
  const clubId = new mongoose.Types.ObjectId();
  const candidateId = new mongoose.Types.ObjectId();
  const slotId = new mongoose.Types.ObjectId();
  const deletedCollections = new Set();
  let deletedJobFilter;
  const originals = new Map();
  const replace = (target, key, value) => {
    originals.set(`${target.modelName || "mongoose"}:${key}`, { target, key, value: target[key] });
    target[key] = value;
  };
  const event = {
    _id: eventId,
    clubId,
    title: "Temporary test event",
    status: "published",
    eventBannerPublicId: "",
    async save() { assert.equal(this.status, "archived"); },
  };

  replace(eventModel, "findOne", async () => event);
  replace(eventModel, "deleteOne", async () => ({ deletedCount: 1 }));
  replace(roundSubmissionModel, "find", () => queryResult([{ files: [] }]));
  replace(scheduleSlotModel, "find", () => queryResult([{ _id: slotId }]));
  replace(roundCandidateModel, "find", () => queryResult([{ _id: candidateId }]));
  replace(roundCandidateModel, "updateMany", async () => ({ modifiedCount: 1 }));
  replace(registerationEventModel, "updateMany", async () => ({ modifiedCount: 1 }));

  for (const [name, model] of [
    ["reservations", scheduleReservationModel],
    ["submissions", roundSubmissionModel],
    ["slots", scheduleSlotModel],
    ["candidates", roundCandidateModel],
    ["memberships", eventMembershipModel],
    ["histories", applicationHistoryModel],
    ["registrations", registerationEventModel],
    ["notifications", notificationModel],
    ["jobs", jobModel],
  ]) {
    replace(model, "deleteMany", async (filter) => {
      deletedCollections.add(name);
      if (name === "jobs") deletedJobFilter = filter;
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
    await deleteEvent(
      { params: { eventId: String(eventId) }, club: { _id: clubId }, body: { confirmation: event.title } },
      res,
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(deletedCollections, new Set([
      "reservations", "submissions", "slots", "candidates", "memberships",
      "histories", "registrations", "notifications", "jobs",
    ]));
    assert.deepEqual(deletedJobFilter.$or[1], {
      type: "round_reminder",
      "payload.eventId": { $in: [String(eventId), eventId] },
    });
    assert.equal(audit.action, "event.delete_with_activity");
    assert.equal(audit.metadata.title, event.title);
  } finally {
    for (const { target, key, value } of originals.values()) target[key] = value;
  }
});
