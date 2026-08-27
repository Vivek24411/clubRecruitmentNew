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
  eventRound,
  normalizeRounds,
  normalizeVerticals,
  studentApplicationStatus,
  upsertScheduleSlot,
  verticalDeadlineAt,
  verticalEligibilitySource,
  verticalForRound,
  verticalRounds,
  withdrawRegistrationWorkflow,
} = require("../src/services/eventWorkflow.services");
const eventMembershipModel = require("../src/models/eventMembership.model");
const clubModel = require("../src/models/club.model");
const registerationEventModel = require("../src/models/registerationEvent.model");
const eventModel = require("../src/models/event.model");
const scheduleSlotModel = require("../src/models/scheduleSlot.model");
const scheduleReservationModel = require("../src/models/scheduleReservation.model");
const roundCandidateModel = require("../src/models/roundCandidate.model");
const { prepareRoundSubmission } = require("../src/services/roundSubmission.services");
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

test("club profiles support multiple named phone contacts", async () => {
  const club = new clubModel({
    name: "Contact Test Club",
    userName: "contact-test-club",
    password: "not-a-real-password-hash",
    contactPersons: [
      { name: "Asha", role: "Secretary", phone: "+91 90000 00000" },
      { name: "Ravi", role: "Coordinator", phone: "+91 91111 11111" },
    ],
  });
  await club.validate();
  assert.equal(club.contactPersons.length, 2);
  assert.equal(club.contactPersons[0].role, "Secretary");
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

test("event full descriptions are optional", async () => {
  const event = new eventModel({
    clubId: new mongoose.Types.ObjectId(),
    title: "Short event",
    shortDescription: "The listing summary is enough",
  });
  await event.validate();
  assert.equal(event.longDescription, "");
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

test("application-form rounds preserve text, checkbox, and dropdown questions", () => {
  const [round] = normalizeRounds([{
    title: "Application form",
    type: "submission",
    submissionFields: [
      { key: "name", label: "Preferred name", type: "short_text", required: true },
      { key: "motivation", label: "Why do you want to join?", type: "long_text", required: false },
      { key: "consent", label: "I confirm these details", type: "boolean", required: true },
      { key: "domain", label: "Preferred domain", type: "select", options: ["Design", "Technology", "Design", ""] },
    ],
  }]);
  assert.equal(round.submissionEnabled, true);
  assert.deepEqual(round.submissionFields.map((field) => field.type), ["short_text", "long_text", "boolean", "select"]);
  assert.deepEqual(round.submissionFields.map((field) => field.required), [true, false, true, true]);
  assert.deepEqual(round.submissionFields[3].options, ["Design", "Technology"]);
});

test("dropdown submissions only accept a configured option", () => {
  const round = {
    submissionFields: [{ key: "domain", label: "Preferred domain", type: "select", required: true, options: ["Design", "Technology"] }],
  };
  assert.throws(() => prepareRoundSubmission({
    round,
    answersJSON: JSON.stringify([{ key: "domain", value: "Finance" }]),
    fileKeysJSON: "[]",
  }), /valid option/);
  const prepared = prepareRoundSubmission({
    round,
    answersJSON: JSON.stringify([{ key: "domain", value: "Design" }]),
    fileKeysJSON: "[]",
  });
  assert.equal(prepared.cleanAnswers[0].value, "Design");
});

test("submission rounds share one round window and accept Drive-link inputs", () => {
  const [round] = normalizeRounds([{
    title: "Submit the task",
    type: "submission",
    startsAt: "2026-09-02T10:00:00.000Z",
    endsAt: "2026-09-04T18:00:00.000Z",
    submissionOpensAt: "2026-09-01T10:00:00.000Z",
    submissionDeadlineAt: "2026-09-10T18:00:00.000Z",
    submissionFields: [{ key: "drive", label: "Drive folder", type: "drive_link" }],
  }]);
  assert.equal(round.scheduleMode, "common");
  assert.equal(round.submissionOpensAt.toISOString(), round.startsAt.toISOString());
  assert.equal(round.submissionDeadlineAt.toISOString(), round.endsAt.toISOString());
  assert.equal(round.submissionFields[0].type, "drive_link");
});

test("vertical normalization preserves an optional problem-statement link", () => {
  const [vertical] = normalizeVerticals([{
    title: "Product",
    registrationType: "team",
    minTeamSize: 2,
    maxTeamSize: 4,
    problemStatementUrl: "https://drive.google.com/example",
    rounds: [],
  }]);
  assert.equal(vertical.problemStatementUrl, "https://drive.google.com/example");
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

test("every event carries at least one vertical holding its rounds", async () => {
  const event = new eventModel({
    clubId: new mongoose.Types.ObjectId(),
    title: "Core recruitment",
    shortDescription: "Vertical seeding",
    longDescription: "Events without verticals still get a hidden default one",
    rounds: normalizeRounds([
      { title: "Screening test", type: "test" },
      { title: "Interview", type: "interview" },
    ]),
  });
  await event.validate();

  assert.equal(event.verticals.length, 1);
  assert.equal(event.verticals[0].isDefault, true);
  assert.equal(event.verticalsEnabled, false);
  assert.equal(event.verticals[0].rounds.length, 2);
  assert.equal(event.verticals[0].numberOfRounds, 2);
  // The round ids the workflow tables point at must survive the move.
  assert.deepEqual(
    event.verticals[0].rounds.map((round) => String(round._id)),
    event.rounds.map((round) => String(round._id)),
  );
});

test("a first-round application form shares the registration deadline", async () => {
  const deadline = new Date("2026-10-01T18:30:00.000Z");
  const event = new eventModel({
    clubId: new mongoose.Types.ObjectId(),
    title: "Application-first recruitment",
    shortDescription: "The form is the registration step",
    registrationDeadlineAt: deadline,
    rounds: normalizeRounds([{
      title: "Application form",
      type: "submission",
      startsAt: "2026-09-01T00:00:00.000Z",
      endsAt: "2026-09-20T00:00:00.000Z",
      submissionFields: [{ key: "motivation", label: "Motivation", type: "long_text" }],
    }]),
  });
  await event.validate();
  assert.equal(event.verticals[0].rounds[0].endsAt.toISOString(), deadline.toISOString());
  assert.equal(event.verticals[0].rounds[0].submissionDeadlineAt.toISOString(), deadline.toISOString());
});

test("each vertical carries independent rounds and team rules", async () => {
  const event = new eventModel({
    clubId: new mongoose.Types.ObjectId(),
    title: "Multi-track recruitment",
    shortDescription: "Verticals",
    longDescription: "Tech and design run independently",
    verticalsEnabled: true,
    maxVerticalApplications: 2,
    verticals: normalizeVerticals([
      {
        title: "Tech",
        registrationType: "team",
        minTeamSize: 2,
        maxTeamSize: 4,
        rounds: [{ title: "Coding task", type: "submission" }, { title: "Interview", type: "interview" }],
      },
      {
        title: "Design",
        registrationType: "individual",
        rounds: [{ title: "Portfolio", type: "submission" }],
      },
    ]),
  });
  await event.validate();

  const [tech, design] = event.verticals;
  assert.equal(tech.numberOfRounds, 2);
  assert.equal(design.numberOfRounds, 1);
  assert.equal(design.registrationType, "individual");
  assert.equal(design.maxTeamSize, 1);
  assert.equal(tech.isDefault, false);
  // An individual track evaluates every round per student.
  assert.equal(design.rounds[0].evaluationScope, "participant");
  assert.equal(event.verticalsEnabled, true);

  // Round ids are globally unique, so a round always identifies one vertical.
  const designRoundId = design.rounds[0]._id;
  assert.equal(String(verticalForRound(event, designRoundId)._id), String(design._id));
  assert.equal(String(eventRound(event, designRoundId)._id), String(designRoundId));
  assert.equal(verticalRounds(event, tech._id).length, 2);
  assert.equal(verticalRounds(event, design._id).length, 1);
});

test("normalizeVerticals preserves ids so live applications keep resolving", () => {
  const verticalId = new mongoose.Types.ObjectId();
  const roundId = new mongoose.Types.ObjectId();
  const [vertical] = normalizeVerticals([{
    _id: verticalId,
    title: "Tech",
    rounds: [{ _id: roundId, title: "Interview", type: "interview" }],
  }]);
  assert.equal(String(vertical._id), String(verticalId));
  assert.equal(String(vertical.rounds[0]._id), String(roundId));
});

test("application status is scored inside the student's own vertical", () => {
  const techRoundId = new mongoose.Types.ObjectId();
  const designRoundId = new mongoose.Types.ObjectId();
  const techVerticalId = new mongoose.Types.ObjectId();
  const designVerticalId = new mongoose.Types.ObjectId();
  const studentId = new mongoose.Types.ObjectId();
  const event = {
    verticals: [
      { _id: techVerticalId, rounds: [{ _id: techRoundId, order: 1 }] },
      { _id: designVerticalId, rounds: [{ _id: designRoundId, order: 1 }] },
    ],
  };
  const advancedInTech = [{
    roundId: techRoundId,
    verticalId: techVerticalId,
    scope: "participant",
    studentId,
    participantIds: [studentId],
    status: "advanced",
  }];
  const rejectedInDesign = [{
    roundId: designRoundId,
    verticalId: designVerticalId,
    scope: "participant",
    studentId,
    participantIds: [studentId],
    status: "rejected",
  }];

  // Clearing the only round of a vertical means selected in that vertical,
  // and says nothing about the other one.
  assert.equal(
    studentApplicationStatus(event, advancedInTech, studentId, "in_progress", techVerticalId),
    "selected",
  );
  assert.equal(
    studentApplicationStatus(event, rejectedInDesign, studentId, "in_progress", designVerticalId),
    "rejected",
  );
});

test("a vertical inherits event eligibility until it declares its own", () => {
  const event = { eligibilityMode: "undergraduate", programmeEligibility: [{ programme: "undergraduate", years: [1, 2] }], eligibilityYears: [1, 2] };
  assert.equal(verticalEligibilitySource(event, { eligibilityMode: null }), event);

  const override = verticalEligibilitySource(event, {
    eligibilityMode: "all_iitr",
    programmeEligibility: [{ programme: "mtech", years: [1] }],
  });
  assert.equal(override.eligibilityMode, "all_iitr");
  assert.deepEqual(override.programmeEligibility, [{ programme: "mtech", years: [1] }]);

  // A vertical deadline overrides the event's; absent one, the event's holds.
  const deadline = new Date("2026-10-01T00:00:00.000Z");
  assert.equal(verticalDeadlineAt({ registrationDeadlineAt: deadline }, { registrationDeadlineAt: null }), deadline);
  const own = new Date("2026-09-01T00:00:00.000Z");
  assert.equal(verticalDeadlineAt({ registrationDeadlineAt: deadline }, { registrationDeadlineAt: own }), own);
});

test("team membership is unique per vertical, not per event", () => {
  const indexes = eventMembershipModel.schema.indexes();
  const unique = indexes.find(([, options]) => options.unique);
  assert.deepEqual(unique[0], { eventId: 1, verticalId: 1, studentId: 1 });
  assert.ok(eventMembershipModel.schema.path("verticalId"));
  assert.equal(eventMembershipModel.schema.path("verticalId").isRequired, true);
  // Candidates and registrations are stamped too, so club-side event-wide
  // queries can filter without joining back through the registration.
  assert.equal(roundCandidateModel.schema.path("verticalId").isRequired, true);
  assert.equal(registerationEventModel.schema.path("verticalId").isRequired, true);
});

test("an event using verticals needs more than one", async () => {
  const event = new eventModel({
    clubId: new mongoose.Types.ObjectId(),
    title: "Single track",
    shortDescription: "Invalid",
    longDescription: "Turning on verticals with only one is a configuration error",
    verticalsEnabled: true,
    verticals: normalizeVerticals([{ title: "Only one", rounds: [] }]),
  });
  await assert.rejects(() => event.validate(), /at least two verticals/);
});

test("no surviving index locks a student to one application per event", () => {
  // A student holds one application per vertical, so nothing may enforce
  // uniqueness on (eventId, studentId) alone. The legacy unique indexes that
  // once did are dropped by migrate-v8; these assertions stop them coming back
  // via the schema.
  const registrationLock = registerationEventModel.schema.indexes().find(([keys, options]) =>
    options?.unique && keys.eventId === 1 && keys.studentId === 1 && keys.verticalId == null);
  assert.equal(registrationLock, undefined);

  const membershipLock = eventMembershipModel.schema.indexes().find(([keys, options]) =>
    options?.unique && keys.eventId === 1 && keys.studentId === 1 && keys.verticalId == null);
  assert.equal(membershipLock, undefined);

  // The non-unique lookup index must carry an explicit name: the generated one
  // would be "eventId_1_studentId_1", which collides with the legacy unique
  // index still present on upgraded databases and breaks autoIndex.
  const lookup = eventMembershipModel.schema.indexes().find(([keys, options]) =>
    !options?.unique && keys.eventId === 1 && keys.studentId === 1);
  assert.equal(lookup[1].name, "event_student_lookup");
});

test("withdrawing an application retires rounds the club had already decided", async () => {
  // The club's workspace hides "withdrawn" and "revoked" candidates. Before,
  // withdrawal skipped already-decided candidates, so a student who withdrew
  // after being advanced stayed visible in the round workspace forever.
  const registrationId = new mongoose.Types.ObjectId();
  const saved = [];
  let queried = null;
  const originals = { find: roundCandidateModel.find, findOne: scheduleSlotModel.find };
  roundCandidateModel.find = async (query) => {
    queried = query;
    return [
      { _id: new mongoose.Types.ObjectId(), status: "advanced", score: 88, notes: "strong", participantIds: [], save: async function () { saved.push(this.status); } },
      { _id: new mongoose.Types.ObjectId(), status: "eligible", participantIds: [], save: async function () { saved.push(this.status); } },
    ];
  };
  scheduleSlotModel.find = async () => [];
  try {
    await withdrawRegistrationWorkflow(registrationId);
    // Only system-revoked records are exempt; decided ones are retired too.
    assert.deepEqual(queried.status, { $ne: "revoked" });
    assert.deepEqual(saved, ["withdrawn", "withdrawn"]);
  } finally {
    roundCandidateModel.find = originals.find;
    scheduleSlotModel.find = originals.findOne;
  }
});

test("importing candidates into another event reports why nothing moved", async () => {
  // A club page left open across a decision change still offers candidates
  // that are no longer advanced. Silently answering "0 created" gave the club
  // no way to tell success from a stale selection.
  const { extractCandidates } = require("../src/controllers/workflow.controllers");
  const eventId = new mongoose.Types.ObjectId();
  const roundId = new mongoose.Types.ObjectId();
  const originals = { findOne: eventModel.findOne, find: roundCandidateModel.find };
  const event = {
    _id: eventId,
    verticals: [{ _id: new mongoose.Types.ObjectId(), title: "bye", rounds: [{ _id: roundId, order: 1, title: "Test" }] }],
  };
  eventModel.findOne = () => ({ then: (resolve) => resolve(event) });
  roundCandidateModel.find = async () => [];
  try {
    let status = 200;
    let body = null;
    const res = { status(code) { status = code; return this; }, json(payload) { body = payload; return payload; } };
    await extractCandidates({
      club: { _id: new mongoose.Types.ObjectId() },
      params: { eventId: String(eventId), roundId: String(roundId) },
      body: { candidateIds: [String(new mongoose.Types.ObjectId())], targetEventId: String(eventId), targetRoundId: String(roundId) },
    }, res);
    assert.equal(status, 409, "a no-op import must not report success");
    assert.match(body.msg, /still advanced/);
    assert.equal(body.success, false);
  } finally {
    eventModel.findOne = originals.findOne;
    roundCandidateModel.find = originals.find;
  }
});
