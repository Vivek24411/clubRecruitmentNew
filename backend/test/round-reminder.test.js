const test = require("node:test");
const assert = require("node:assert/strict");
const jobModel = require("../src/models/job.model");
const {
  buildIncompleteSubmissionNotification,
  buildRoundReminderNotification,
  candidateRecipientIds,
  dateInKolkata,
  enqueueInterviewRemindersForSlot,
  enqueueSubmissionDeadlineReminders,
  incompleteSubmissionRecipientIds,
  interviewReminderRunAt,
  roundReminderJobId,
  submissionDeadlineReminderRunAt,
} = require("../src/services/roundReminder.services");

test("job records support durable round reminders", () => {
  assert.ok(jobModel.schema.path("type").enumValues.includes("round_reminder"));
});

test("submission deadlines are reminded six hours beforehand", () => {
  const deadline = new Date("2026-08-24T18:29:59.000Z");
  const now = new Date("2026-08-24T08:00:00.000Z");
  assert.equal(
    submissionDeadlineReminderRunAt(deadline, now).toISOString(),
    "2026-08-24T12:29:59.000Z",
  );
});

test("interviews are reminded two hours beforehand", () => {
  const startsAt = new Date("2026-08-24T13:30:00.000Z");
  const now = new Date("2026-08-24T08:00:00.000Z");
  assert.equal(
    interviewReminderRunAt(startsAt, now).toISOString(),
    "2026-08-24T11:30:00.000Z",
  );
});

test("students becoming eligible inside the lead window are reminded immediately", () => {
  const now = new Date("2026-08-24T12:30:00.000Z");
  assert.equal(
    submissionDeadlineReminderRunAt("2026-08-24T15:30:00.000Z", now).toISOString(),
    now.toISOString(),
  );
  assert.equal(
    interviewReminderRunAt("2026-08-24T13:30:00.000Z", now).toISOString(),
    now.toISOString(),
  );
});

test("past round times do not create reminders", () => {
  const now = new Date("2026-08-24T13:30:00.000Z");
  assert.equal(submissionDeadlineReminderRunAt(now, now), null);
  assert.equal(interviewReminderRunAt("2026-08-24T13:29:59.000Z", now), null);
});

test("team reminders deduplicate every eligible participant", () => {
  const first = "507f1f77bcf86cd799439011";
  const second = "507f1f77bcf86cd799439012";
  assert.deepEqual(candidateRecipientIds({ participantIds: [first, second, first] }), [first, second]);
});

test("manual submission reminders exclude submitted candidates and deduplicate students", () => {
  const submittedCandidate = "507f1f77bcf86cd799439021";
  assert.deepEqual(incompleteSubmissionRecipientIds([
    {
      _id: submittedCandidate,
      participantIds: ["507f1f77bcf86cd799439011"],
      status: "eligible",
    },
    {
      _id: "507f1f77bcf86cd799439022",
      participantIds: ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439012"],
      status: "eligible",
    },
    {
      _id: "507f1f77bcf86cd799439023",
      participantIds: ["507f1f77bcf86cd799439013"],
      status: "submitted",
    },
  ], [submittedCandidate]), ["507f1f77bcf86cd799439012"]);
});

test("only active candidates receive deadline jobs", async () => {
  const original = jobModel.findOneAndUpdate;
  const queued = [];
  jobModel.findOneAndUpdate = async (filter, update) => {
    queued.push({ filter, update });
    return { _id: filter._id, status: "queued", delivery: {} };
  };
  try {
    await enqueueSubmissionDeadlineReminders([
      {
        _id: "507f1f77bcf86cd799439021",
        eventId: "507f1f77bcf86cd799439031",
        participantIds: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
        status: "eligible",
      },
      {
        _id: "507f1f77bcf86cd799439022",
        eventId: "507f1f77bcf86cd799439031",
        participantIds: ["507f1f77bcf86cd799439013"],
        status: "submitted",
      },
    ], {
      _id: "507f1f77bcf86cd799439041",
      submissionDeadlineAt: "2026-08-24T18:29:59.000Z",
    }, { now: new Date("2026-08-24T08:00:00.000Z") });
    assert.equal(queued.length, 2);
    assert.ok(queued.every(({ update }) => update.$setOnInsert.type === "round_reminder"));
    assert.ok(queued.every(({ update }) => update.$setOnInsert.payload.kind === "submission_deadline"));
  } finally {
    jobModel.findOneAndUpdate = original;
  }
});

test("slot jobs are limited to interviews", async () => {
  const original = jobModel.findOneAndUpdate;
  let calls = 0;
  jobModel.findOneAndUpdate = async (filter) => {
    calls += 1;
    return { _id: filter._id, status: "queued", delivery: {} };
  };
  const slot = {
    _id: "507f1f77bcf86cd799439051",
    eventId: "507f1f77bcf86cd799439031",
    roundId: "507f1f77bcf86cd799439041",
    candidateId: "507f1f77bcf86cd799439021",
    participantIds: ["507f1f77bcf86cd799439011"],
    startAt: "2026-08-24T13:30:00.000Z",
    status: "scheduled",
  };
  try {
    await enqueueInterviewRemindersForSlot(slot, {
      roundType: "presentation",
      now: new Date("2026-08-24T08:00:00.000Z"),
    });
    assert.equal(calls, 0);
    await enqueueInterviewRemindersForSlot(slot, {
      roundType: "interview",
      now: new Date("2026-08-24T08:00:00.000Z"),
    });
    assert.equal(calls, 1);
  } finally {
    jobModel.findOneAndUpdate = original;
  }
});

test("rescheduled round times receive a different idempotent job id", () => {
  const sourceId = "507f1f77bcf86cd799439021";
  const studentId = "507f1f77bcf86cd799439011";
  const first = roundReminderJobId("interview", sourceId, studentId, "2026-08-24T13:30:00.000Z");
  const duplicate = roundReminderJobId("interview", sourceId, studentId, "2026-08-24T13:30:00.000Z");
  const rescheduled = roundReminderJobId("interview", sourceId, studentId, "2026-08-24T14:00:00.000Z");
  assert.equal(first, duplicate);
  assert.notEqual(first, rescheduled);
});

test("deadline emails include the club, event, round, and exact deadline", () => {
  const deadline = new Date("2026-08-24T18:29:59.000Z");
  const notification = buildRoundReminderNotification({
    kind: "submission_deadline",
    event: { _id: "507f1f77bcf86cd799439031", title: "Developer Recruitment" },
    round: { title: "Round 2 · Backend task", submissionDeadlineAt: deadline },
    clubName: "Programming Club",
    now: new Date("2026-08-24T12:29:59.000Z"),
  });
  assert.match(notification.title, /Round 2/);
  assert.match(notification.message, /Developer Recruitment/);
  assert.match(notification.message, /Programming Club/);
  assert.equal(notification.emailDetails.startsAt, deadline);
  assert.equal(notification.emailDetails.dateLabel, "Submission deadline");
  assert.match(notification.title, /today/);
});

test("incomplete application emails explain what is missing and show the exact deadline", () => {
  const deadline = new Date("2026-09-02T18:29:59.000Z");
  const notification = buildIncompleteSubmissionNotification({
    event: { _id: "507f1f77bcf86cd799439031", title: "Kshitij Recruitment" },
    round: { title: "Application round", submissionDeadlineAt: deadline },
    clubName: "Kshitij",
  });
  assert.equal(notification.type, "submission_due_reminder");
  assert.match(notification.title, /Complete your application/);
  assert.match(notification.message, /not been submitted/);
  assert.match(notification.message, /Kshitij/);
  assert.equal(notification.emailDetails.startsAt, deadline);
  assert.equal(notification.emailDetails.dateLabel, "Submission deadline");
  assert.equal(notification.link, "/event/507f1f77bcf86cd799439031");
});

test("deadline wording uses IIT Roorkee's local calendar date", () => {
  assert.equal(dateInKolkata("2026-08-24T20:00:00.000Z"), "2026-08-25");
  const notification = buildRoundReminderNotification({
    kind: "submission_deadline",
    event: { _id: "507f1f77bcf86cd799439031", title: "Developer Recruitment" },
    round: { title: "Round 2", submissionDeadlineAt: "2026-08-24T20:00:00.000Z" },
    clubName: "Programming Club",
    now: new Date("2026-08-24T17:00:00.000Z"),
  });
  assert.match(notification.title, /coming up/);
});

test("interview emails include the two-hour warning and access details", () => {
  const startsAt = new Date("2026-08-24T13:30:00.000Z");
  const notification = buildRoundReminderNotification({
    kind: "interview",
    event: { _id: "507f1f77bcf86cd799439031", title: "Developer Recruitment" },
    round: { title: "Round 3 · Interview" },
    clubName: "Programming Club",
    now: new Date("2026-08-24T11:30:00.000Z"),
    slot: {
      startAt: startsAt,
      venue: "SAC 101",
      meetingUrl: "https://meet.google.com/example",
    },
  });
  assert.match(notification.title, /Interview reminder/);
  assert.match(notification.message, /2 hours/);
  assert.equal(notification.emailDetails.startsAt, startsAt);
  assert.equal(notification.emailDetails.venue, "SAC 101");
  assert.equal(notification.emailDetails.meetingUrl, "https://meet.google.com/example");
});
