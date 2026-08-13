const DEFAULT_BRANCHES = [
  { name: "Architecture and Planning", durationYears: 5 },
  { name: "Biosciences and Bioengineering", durationYears: 4 },
  { name: "Chemical Engineering", durationYears: 4 },
  { name: "Civil Engineering", durationYears: 4 },
  { name: "Computer Science and Engineering", durationYears: 4 },
  { name: "Data Science and Artificial Intelligence", durationYears: 4 },
  { name: "Electrical Engineering", durationYears: 4 },
  { name: "Electronics and Communication Engineering", durationYears: 4 },
  { name: "Engineering Physics", durationYears: 4 },
  { name: "Geophysical Technology (GPT)", durationYears: 5 },
  { name: "Mechanical Engineering", durationYears: 4 },
  { name: "Metallurgical and Materials Engineering", durationYears: 4 },
  { name: "Production and Industrial Engineering", durationYears: 4 },
];

const YEAR_LABELS = {
  1: "First year",
  2: "Second year",
  3: "Third year",
  4: "Fourth year",
  5: "Fifth year",
};

function normalizedAcademicConfiguration(settings) {
  const source = settings?.academicConfiguration || settings || {};
  const branches = Array.isArray(source.branches) && source.branches.length
    ? source.branches.map((branch) => ({
      name: String(branch.name || "").trim(),
      durationYears: Number(branch.durationYears) === 5 ? 5 : 4,
    })).filter((branch) => branch.name)
    : DEFAULT_BRANCHES;
  return {
    rolloverMonth: Math.min(Math.max(Number(source.rolloverMonth) || 6, 1), 12),
    rolloverDay: Math.min(Math.max(Number(source.rolloverDay) || 1, 1), 28),
    branches,
  };
}

function academicCycleStartYear(now = new Date(), configuration = {}) {
  const config = normalizedAcademicConfiguration(configuration);
  const month = now.getMonth() + 1;
  const hasRolled = month > config.rolloverMonth
    || (month === config.rolloverMonth && now.getDate() >= config.rolloverDay);
  return hasRolled ? now.getFullYear() : now.getFullYear() - 1;
}

function parseAcademicYear(value) {
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 5) return numeric;
  const normalized = String(value || "").trim().toLowerCase();
  const labels = {
    first: 1, "first year": 1, "1st": 1,
    second: 2, "second year": 2, "2nd": 2,
    third: 3, "third year": 3, "3rd": 3,
    fourth: 4, "fourth year": 4, "4th": 4,
    fifth: 5, "fifth year": 5, "5th": 5,
  };
  return labels[normalized] || null;
}

function inferProgramStartYear(currentAcademicYear, now = new Date(), configuration = {}) {
  const year = parseAcademicYear(currentAcademicYear);
  if (!year) return null;
  return academicCycleStartYear(now, configuration) - year + 1;
}

function deriveAcademicState(student, settings, now = new Date()) {
  const configuration = normalizedAcademicConfiguration(settings);
  const duration = Number(student.courseDurationYears) === 5 ? 5 : 4;
  const storedYear = parseAcademicYear(student.academicYear || student.year) || 1;
  const programStartYear = Number(student.programStartYear)
    || inferProgramStartYear(storedYear, now, configuration);
  const academicYear = academicCycleStartYear(now, configuration) - programStartYear + 1;
  if (academicYear > duration) {
    return {
      programStartYear,
      courseDurationYears: duration,
      academicYear: null,
      academicStatus: "passed_out",
      year: "Passed out",
    };
  }
  const boundedYear = Math.min(Math.max(academicYear, 1), 5);
  return {
    programStartYear,
    courseDurationYears: duration,
    academicYear: boundedYear,
    academicStatus: "studying",
    year: YEAR_LABELS[boundedYear],
  };
}

async function syncAcademicState(student, settings, now = new Date()) {
  if (!student) return null;
  const state = deriveAcademicState(student, settings, now);
  const changed = ["programStartYear", "courseDurationYears", "academicYear", "academicStatus", "year"]
    .some((key) => String(student[key] ?? "") !== String(state[key] ?? ""));
  Object.assign(student, state);
  if (changed && typeof student.save === "function") await student.save();
  return state;
}

function eventEligibility(event, student, settings) {
  const state = deriveAcademicState(student, settings);
  if (state.academicStatus === "passed_out" && !event.allowPassedOut) {
    return { eligible: false, reason: "This event is not open to passed-out students", state };
  }
  if (event.eligibilityYears?.length && !event.eligibilityYears.includes(state.academicYear)) {
    return { eligible: false, reason: `This event is open to ${event.eligibilityYears.map((year) => YEAR_LABELS[year]).join(", ")}`, state };
  }
  if (event.eligibilityBranches?.length && !event.eligibilityBranches.includes(student.branch)) {
    return { eligible: false, reason: "Your branch is not included in this event's eligibility", state };
  }
  return { eligible: true, reason: "", state };
}

module.exports = {
  DEFAULT_BRANCHES,
  YEAR_LABELS,
  academicCycleStartYear,
  deriveAcademicState,
  eventEligibility,
  inferProgramStartYear,
  normalizedAcademicConfiguration,
  parseAcademicYear,
  syncAcademicState,
};
