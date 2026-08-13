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
const { normalizeRounds, upsertScheduleSlot } = require("../src/services/eventWorkflow.services");
const scheduleSlotModel = require("../src/models/scheduleSlot.model");
const scheduleReservationModel = require("../src/models/scheduleReservation.model");

test("academic year rolls on the configured June date", () => {
  const config = { rolloverMonth: 6, rolloverDay: 15, branches: [{ name: "Example", durationYears: 4 }] };
  assert.equal(academicCycleStartYear(new Date("2026-06-14T10:00:00Z"), config), 2025);
  assert.equal(academicCycleStartYear(new Date("2026-06-15T10:00:00Z"), config), 2026);
  assert.equal(inferProgramStartYear(3, new Date("2026-08-01T10:00:00Z"), config), 2024);
});

test("default academic options include the five-year GPT branch", () => {
  assert.deepEqual(
    DEFAULT_BRANCHES.find((branch) => branch.name === "Geophysical Technology (GPT)"),
    { name: "Geophysical Technology (GPT)", durationYears: 5 },
  );
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
