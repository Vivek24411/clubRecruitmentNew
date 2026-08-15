const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const {
  DEFAULT_BRANCHES,
  academicCycleStartYear,
  deriveAcademicState,
  eventEligibility,
  inferProgramStartYear,
} = require("../src/services/academic.services");
const {
  normalizeRounds,
  studentApplicationStatus,
  upsertScheduleSlot,
} = require("../src/services/eventWorkflow.services");
const registerationEventModel = require("../src/models/registerationEvent.model");
const eventModel = require("../src/models/event.model");
const scheduleSlotModel = require("../src/models/scheduleSlot.model");
const scheduleReservationModel = require("../src/models/scheduleReservation.model");
const roundCandidateModel = require("../src/models/roundCandidate.model");
const sessionModel = require("../src/models/session.model");
const studentModel = require("../src/models/student.model");

test("workflow records preserve exact waitlist and revoked audit states", () => {
  const statuses = roundCandidateModel.schema.path("status").enumValues;
  assert.ok(statuses.includes("waitlisted"));
  assert.ok(statuses.includes("revoked"));
  assert.equal(roundCandidateModel.schema.path("sourceCandidateIds").instance, "Array");
});

test("student profiles and sessions expose optional visual media", () => {
  assert.ok(studentModel.schema.path("profilePicture"));
  assert.ok(studentModel.schema.path("profilePicturePublicId"));
  assert.ok(sessionModel.schema.path("sessionThumbnail"));
  assert.ok(sessionModel.schema.path("sessionThumbnailPublicId"));
  assert.ok(sessionModel.schema.path("createdAt"));
  assert.deepEqual(studentModel.schema.path("programme").enumValues, ["undergraduate", "mtech", "msc", "mba", "phd"]);
});

test("event records normalize programme rules and discard legacy branch eligibility", async () => {
  const event = new eventModel({
    clubId: new mongoose.Types.ObjectId(),
    title: "Programme test",
    shortDescription: "Programme eligibility",
    longDescription: "Programme eligibility validation",
    eligibilityMode: "all_iitr",
    programmeEligibility: [{ programme: "mtech", years: [1, 2] }],
    eligibilityBranches: ["A restricted branch"],
    allowPassedOut: true,
  });
  await event.validate();
  assert.deepEqual(event.programmeEligibility.map((rule) => rule.toObject()), [{ programme: "mtech", years: [1, 2] }]);
  assert.deepEqual(event.eligibilityBranches, []);
  assert.equal(event.allowPassedOut, false);
});

test("registration attempts are historical rather than uniquely locked per student", () => {
  const attemptIndex = registerationEventModel.schema.indexes().find(([keys]) =>
    keys.eventId === 1 && keys.studentId === 1);
  assert.ok(attemptIndex);
  assert.notEqual(attemptIndex[1]?.unique, true);
  assert.equal(attemptIndex[0].registeredAt, -1);
});

test("academic year rolls on the configured June date", () => {
  const config = { rolloverMonth: 6, rolloverDay: 15, branches: [{ name: "Example", durationYears: 4 }] };
  assert.equal(academicCycleStartYear(new Date("2026-06-14T10:00:00Z"), config), 2025);
  assert.equal(academicCycleStartYear(new Date("2026-06-15T10:00:00Z"), config), 2026);
  assert.equal(inferProgramStartYear(3, new Date("2026-08-01T10:00:00Z"), config), 2024);
});

test("default academic options include the five-year integrated GPT programme", () => {
  assert.deepEqual(
    DEFAULT_BRANCHES.find((branch) => branch.name === "Integrated M.Tech. Geophysical Technology"),
    { name: "Integrated M.Tech. Geophysical Technology", durationYears: 5 },
  );
  assert.equal(DEFAULT_BRANCHES.length, 20);
});

test("academic state becomes passed out after the configured course duration", () => {
  const settings = { academicConfiguration: { rolloverMonth: 6, rolloverDay: 1, branches: [] } };
  const state = deriveAcademicState({ programStartYear: 2021, courseDurationYears: 4, academicYear: 4 }, settings, new Date("2026-08-01T10:00:00Z"));
  assert.equal(state.academicStatus, "passed_out");
  assert.equal(state.year, "Passed out");
});

test("event eligibility enforces structured years", () => {
  const settings = { academicConfiguration: { rolloverMonth: 6, rolloverDay: 1, branches: [] } };
  const student = {
    programStartYear: inferProgramStartYear(2, new Date(), settings),
    courseDurationYears: 4,
    academicYear: 2,
    branch: "Example",
  };
  assert.equal(eventEligibility({ eligibilityYears: [2], eligibilityBranches: [], allowPassedOut: false }, student, settings).eligible, true);
  assert.equal(eventEligibility({ eligibilityYears: [1], eligibilityBranches: [], allowPassedOut: false }, student, settings).eligible, false);
});

test("postgraduate and PhD durations use the June programme rollover", () => {
  const settings = { academicConfiguration: { rolloverMonth: 6, rolloverDay: 1, branches: [] } };
  const mtech = deriveAcademicState({
    programme: "mtech",
    programStartYear: 2024,
    academicYear: 2,
    branch: "Power Systems Engineering",
  }, settings, new Date("2026-06-01T10:00:00Z"));
  const phd = deriveAcademicState({
    programme: "phd",
    programStartYear: 2022,
    academicYear: 4,
    branch: "Electrical Engineering",
  }, settings, new Date("2026-06-01T10:00:00Z"));
  assert.equal(mtech.academicStatus, "passed_out");
  assert.equal(mtech.courseDurationYears, 2);
  assert.equal(phd.academicYear, 5);
  assert.equal(phd.courseDurationYears, 5);
});

test("event eligibility uses programme and year but never branch", () => {
  const settings = { academicConfiguration: { rolloverMonth: 6, rolloverDay: 1, branches: [] } };
  const student = {
    programme: "mtech",
    programStartYear: inferProgramStartYear(2, new Date(), settings),
    academicYear: 2,
    branch: "Any manually entered discipline",
  };
  const event = {
    eligibilityMode: "all_iitr",
    programmeEligibility: [
      { programme: "undergraduate", years: [] },
      { programme: "mtech", years: [2] },
    ],
    eligibilityBranches: ["A different branch"],
  };
  assert.equal(eventEligibility(event, student, settings).eligible, true);
  assert.equal(eventEligibility({ ...event, programmeEligibility: [{ programme: "mtech", years: [1] }] }, student, settings).eligible, false);
  assert.equal(eventEligibility({ ...event, programmeEligibility: [{ programme: "mba", years: [] }] }, student, settings).eligible, false);
});

test("round normalization supports team and individual interview modes", () => {
  const rounds = normalizeRounds([
    { title: "Team interview", type: "interview", interviewMode: "group" },
    { title: "Individual interview", type: "interview", interviewMode: "individual" },
    { title: "Repository", type: "submission", submissionFields: [{ label: "GitHub", key: "github", type: "github" }] },
  ]);
  assert.equal(rounds[0].evaluationScope, "application");
  assert.equal(rounds[0].scheduleMode, "slots");
  assert.equal(rounds[1].evaluationScope, "participant");
  assert.equal(rounds[2].submissionEnabled, true);
  assert.deepEqual(rounds.map((round) => round.order), [1, 2, 3]);
});

test("common tests always evaluate each participant independently", () => {
  const [testRound] = normalizeRounds([
    { title: "Common test", type: "test", evaluationScope: "application" },
  ]);
  assert.equal(testRound.evaluationScope, "participant");
});

test("application status follows the logged-in student's latest individual result", () => {
  const firstRoundId = new mongoose.Types.ObjectId();
  const secondRoundId = new mongoose.Types.ObjectId();
  const firstStudentId = new mongoose.Types.ObjectId();
  const secondStudentId = new mongoose.Types.ObjectId();
  const event = {
    rounds: [
      { _id: firstRoundId, order: 1 },
      { _id: secondRoundId, order: 2 },
    ],
  };
  const candidates = [
    {
      roundId: firstRoundId,
      scope: "application",
      participantIds: [firstStudentId, secondStudentId],
      status: "advanced",
    },
    {
      roundId: secondRoundId,
      scope: "participant",
      studentId: firstStudentId,
      participantIds: [firstStudentId],
      status: "advanced",
    },
    {
      roundId: secondRoundId,
      scope: "participant",
      studentId: secondStudentId,
      participantIds: [secondStudentId],
      status: "rejected",
    },
  ];

  assert.equal(studentApplicationStatus(event, candidates, firstStudentId), "selected");
  assert.equal(studentApplicationStatus(event, candidates, secondStudentId), "rejected");
});

test("legacy round details are normalized without losing their purpose", () => {
  const [testRound, submission] = normalizeRounds([
    { Round: 1, Type: "Test", TestDate: "2026-09-10" },
    { Round: 2, Type: "Submission", SubmissionDeadline: "2026-09-20", GoogleFormLink: "https://example.com" },
  ]);
  assert.equal(testRound.type, "test");
  assert.equal(testRound.scheduleMode, "common");
  assert.equal(submission.type, "submission");
  assert.equal(submission.submissionFields[0].type, "url");
});

test("new interview slots retain the candidate reference", async () => {
  const originals = {
    findOne: scheduleSlotModel.findOne,
    findOneAndUpdate: scheduleSlotModel.findOneAndUpdate,
    insertMany: scheduleReservationModel.insertMany,
    deleteMany: scheduleReservationModel.deleteMany,
  };
  let savedUpdate;
  scheduleSlotModel.findOne = (query) => {
    if (query.candidateId) return Promise.resolve(null);
    return {
      populate() { return this; },
      then(resolve) { resolve(null); },
    };
  };
  scheduleSlotModel.findOneAndUpdate = async (_query, update) => {
    savedUpdate = update;
    return { ...update, _id: new mongoose.Types.ObjectId() };
  };
  scheduleReservationModel.insertMany = async () => [];
  scheduleReservationModel.deleteMany = async () => ({ deletedCount: 0 });

  const candidate = {
    _id: new mongoose.Types.ObjectId(),
    eventId: new mongoose.Types.ObjectId(),
    roundId: new mongoose.Types.ObjectId(),
    registrationId: new mongoose.Types.ObjectId(),
    studentId: new mongoose.Types.ObjectId(),
    participantIds: [new mongoose.Types.ObjectId()],
    save: async () => {},
  };
  try {
    await upsertScheduleSlot({
      candidate,
      startAt: "2026-09-10T10:00:00.000Z",
      endAt: "2026-09-10T10:20:00.000Z",
    });
    assert.equal(String(savedUpdate.candidateId), String(candidate._id));
  } finally {
    scheduleSlotModel.findOne = originals.findOne;
    scheduleSlotModel.findOneAndUpdate = originals.findOneAndUpdate;
    scheduleReservationModel.insertMany = originals.insertMany;
    scheduleReservationModel.deleteMany = originals.deleteMany;
  }
});
