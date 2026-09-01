const test = require("node:test");
const assert = require("node:assert/strict");
const { calendarWindow } = require("../src/services/calendar.services");
const { normalizeRounds } = require("../src/services/eventWorkflow.services");
const { prepareRoundSubmission } = require("../src/services/roundSubmission.services");

test("calendar ranges are bounded and ordered", () => {
  const range = calendarWindow({ from: "2026-09-01T00:00:00.000Z", to: "2027-09-01T00:00:00.000Z" });
  assert.equal(range.from.toISOString(), "2026-09-01T00:00:00.000Z");
  assert.throws(() => calendarWindow({ from: "2027-09-01", to: "2026-09-01" }), /invalid/i);
  assert.throws(() => calendarWindow({ from: "2026-01-01", to: "2029-01-02" }), /two years/i);
});

test("round normalization rejects unsafe links and reversed dates", () => {
  assert.throws(() => normalizeRounds([{ title: "Interview", type: "interview", meetingUrl: "javascript:alert(1)" }]), /http or https/i);
  assert.throws(() => normalizeRounds([{
    title: "Interview", type: "interview",
    startsAt: "2026-09-02T12:00:00.000Z", endsAt: "2026-09-02T11:00:00.000Z",
  }]), /end after/i);
});

test("submission validation rejects unknown fields and unsafe typed links", () => {
  const round = { submissionFields: [{ key: "portfolio", label: "Portfolio", type: "url", required: true }] };
  assert.throws(() => prepareRoundSubmission({
    round, answersJSON: JSON.stringify([{ key: "other", value: "hello" }]), fileKeysJSON: "[]",
  }), /unknown field/i);
  assert.throws(() => prepareRoundSubmission({
    round, answersJSON: JSON.stringify([{ key: "portfolio", value: "javascript:alert(1)" }]), fileKeysJSON: "[]",
  }), /http\(s\)/i);
});
