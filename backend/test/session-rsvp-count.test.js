const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const sessionRsvpModel = require("../src/models/sessionRsvp.model");
const { sessionsWithConfirmedRsvpCounts } = require("../src/services/sessionRsvp.services");

test("session responses derive confirmed totals from RSVP records", async () => {
  const firstId = new mongoose.Types.ObjectId();
  const secondId = new mongoose.Types.ObjectId();
  const originalAggregate = sessionRsvpModel.aggregate;
  sessionRsvpModel.aggregate = async (pipeline) => {
    assert.deepEqual(pipeline[0].$match.status.$in, ["confirmed", "attended"]);
    return [{ _id: firstId, count: 2 }];
  };
  try {
    const sessions = await sessionsWithConfirmedRsvpCounts([
      { _id: firstId, title: "With RSVPs", confirmedRsvpCount: 0 },
      { _id: secondId, title: "Without RSVPs", confirmedRsvpCount: 9 },
    ]);
    assert.equal(sessions[0].confirmedRsvpCount, 2);
    assert.equal(sessions[1].confirmedRsvpCount, 0);
  } finally {
    sessionRsvpModel.aggregate = originalAggregate;
  }
});
