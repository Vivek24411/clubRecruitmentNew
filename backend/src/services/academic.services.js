const DEFAULT_BRANCHES = [
  { name: "B.Tech. Biosciences and Bioengineering", durationYears: 4 },
  { name: "B.Tech. Chemical Engineering", durationYears: 4 },
  { name: "B.Tech. Civil Engineering", durationYears: 4 },
  { name: "B.Tech. Computer Science and Engineering", durationYears: 4 },
  { name: "B.Tech. Electrical Engineering", durationYears: 4 },
  { name: "B.Tech. Electronics and Communication Engineering", durationYears: 4 },
  { name: "B.Tech. Mechanical Engineering", durationYears: 4 },
  { name: "B.Tech. Metallurgical and Materials Engineering", durationYears: 4 },
  { name: "B.Tech. Production and Industrial Engineering", durationYears: 4 },
  { name: "B.Tech. Engineering Physics", durationYears: 4 },
  { name: "B.Tech. Data Science and Artificial Intelligence", durationYears: 4 },
  { name: "B.Tech. Energy Engineering", durationYears: 4 },
  { name: "B.Arch. — Bachelor of Architecture", durationYears: 5 },
  { name: "B.Des. — Bachelor of Design", durationYears: 4 },
  { name: "Integrated M.Tech. Geological Technology", durationYears: 5 },
  { name: "Integrated M.Tech. Geophysical Technology", durationYears: 5 },
  { name: "BS–MS Chemical Sciences", durationYears: 5 },
  { name: "BS–MS Economics", durationYears: 5 },
  { name: "BS–MS Mathematics & Computing", durationYears: 5 },
  { name: "BS–MS Physics", durationYears: 5 },
];

const PROGRAMME_DEFINITIONS = [
  { value: "undergraduate", label: "Undergraduate", durationYears: null, branchMode: "configured" },
  { value: "mtech", label: "M.Tech.", durationYears: 2, branchMode: "manual" },
  { value: "msc", label: "M.Sc.", durationYears: 2, branchMode: "manual" },
  { value: "mba", label: "MBA", durationYears: 2, branchMode: "manual" },
  { value: "phd", label: "PhD", durationYears: 5, branchMode: "manual" },
];

const PROGRAMME_VALUES = PROGRAMME_DEFINITIONS.map((programme) => programme.value);
const PROGRAMME_LABELS = Object.fromEntries(PROGRAMME_DEFINITIONS.map((programme) => [programme.value, programme.label]));

const YEAR_LABELS = {
  1: "First year",
  2: "Second year",
  3: "Third year",
  4: "Fourth year",
  5: "Fifth year",
};

function normalizeProgramme(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[.\s-]+/g, "");
  const aliases = {
    undergraduate: "undergraduate",
    ug: "undergraduate",
    btech: "undergraduate",
    barch: "undergraduate",
    bdes: "undergraduate",
    mtech: "mtech",
    msc: "msc",
    mba: "mba",
    phd: "phd",
  };
  return aliases[normalized] || "undergraduate";
}

function normalizedAcademicConfiguration(settings) {
  const source = settings?.academicConfiguration || settings || {};
  const branches = Array.isArray(source.branches) && source.branches.length
    ? source.branches.map((branch) => ({
      name: String(branch.name || "").trim(),
      durationYears: Math.min(Math.max(Number(branch.durationYears) || 4, 1), 5),
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

function programmeDurationYears(programme, branch, configuration = {}, storedDuration) {
  const normalizedProgramme = normalizeProgramme(programme);
  const definition = PROGRAMME_DEFINITIONS.find((item) => item.value === normalizedProgramme);
  if (definition?.durationYears) return definition.durationYears;
  const config = normalizedAcademicConfiguration(configuration);
  const configuredBranch = config.branches.find((item) => item.name === branch);
  if (configuredBranch) return configuredBranch.durationYears;
  return Math.min(Math.max(Number(storedDuration) || 4, 1), 5);
}

function deriveAcademicState(student, settings, now = new Date()) {
  const configuration = normalizedAcademicConfiguration(settings);
  const programme = normalizeProgramme(student.programme);
  const duration = programmeDurationYears(programme, student.branch, configuration, student.courseDurationYears);
  const storedYear = parseAcademicYear(student.academicYear || student.year) || 1;
  const programStartYear = Number(student.programStartYear)
    || inferProgramStartYear(storedYear, now, configuration);
  const academicYear = academicCycleStartYear(now, configuration) - programStartYear + 1;
  if (academicYear > duration) {
    return {
      programme,
      programStartYear,
      courseDurationYears: duration,
      academicYear: null,
      academicStatus: "passed_out",
      year: "Passed out",
    };
  }
  const boundedYear = Math.min(Math.max(academicYear, 1), duration, 5);
  return {
    programme,
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
  const changed = ["programme", "programStartYear", "courseDurationYears", "academicYear", "academicStatus", "year"]
    .some((key) => String(student[key] ?? "") !== String(state[key] ?? ""));
  Object.assign(student, state);
  if (changed && typeof student.save === "function") await student.save();
  return state;
}

function normalizeProgrammeEligibility(value, eligibilityMode = "undergraduate", legacyYears = []) {
  const raw = Array.isArray(value) ? value : [];
  const unique = new Map();
  for (const item of raw) {
    const programme = normalizeProgramme(item?.programme);
    if (!PROGRAMME_VALUES.includes(programme)) continue;
    const maxYears = programmeDurationYears(item?.programme, "", {}, 5);
    const years = [...new Set((Array.isArray(item?.years) ? item.years : [])
      .map(Number)
      .filter((year) => Number.isInteger(year) && year >= 1 && year <= maxYears))]
      .sort((left, right) => left - right);
    unique.set(programme, { programme, years });
  }

  if (eligibilityMode !== "all_iitr") {
    const undergraduate = unique.get("undergraduate");
    const years = undergraduate?.years?.length
      ? undergraduate.years
      : [...new Set((Array.isArray(legacyYears) ? legacyYears : []).map(Number).filter((year) => year >= 1 && year <= 5))];
    return [{ programme: "undergraduate", years }];
  }

  return unique.size
    ? [...unique.values()]
    : PROGRAMME_DEFINITIONS.map((programme) => ({ programme: programme.value, years: [] }));
}

function eventEligibility(event, student, settings) {
  const state = deriveAcademicState(student, settings);
  if (state.academicStatus === "passed_out") {
    return { eligible: false, reason: "This event is only open to current students", state };
  }

  const eligibilityMode = event.eligibilityMode === "all_iitr" ? "all_iitr" : "undergraduate";
  const rules = normalizeProgrammeEligibility(event.programmeEligibility, eligibilityMode, event.eligibilityYears);
  if (eligibilityMode === "undergraduate" && state.programme !== "undergraduate") {
    return { eligible: false, reason: "This event is only open to undergraduate students", state };
  }

  const rule = rules.find((item) => item.programme === state.programme);
  if (!rule) {
    return { eligible: false, reason: `This event is not open to ${PROGRAMME_LABELS[state.programme]} students`, state };
  }
  if (rule.years.length && !rule.years.includes(state.academicYear)) {
    return {
      eligible: false,
      reason: `This event is open to ${rule.years.map((year) => YEAR_LABELS[year]).join(", ")} ${PROGRAMME_LABELS[state.programme]} students`,
      state,
    };
  }
  return { eligible: true, reason: "", state };
}

module.exports = {
  DEFAULT_BRANCHES,
  PROGRAMME_DEFINITIONS,
  PROGRAMME_LABELS,
  PROGRAMME_VALUES,
  YEAR_LABELS,
  academicCycleStartYear,
  deriveAcademicState,
  eventEligibility,
  inferProgramStartYear,
  normalizeProgramme,
  normalizeProgrammeEligibility,
  normalizedAcademicConfiguration,
  parseAcademicYear,
  programmeDurationYears,
  syncAcademicState,
};
