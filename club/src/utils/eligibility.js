export const PROGRAMMES = [
  { value: "undergraduate", label: "Undergraduate", maxYears: 5 },
  { value: "mtech", label: "M.Tech.", maxYears: 2 },
  { value: "msc", label: "M.Sc.", maxYears: 2 },
  { value: "mba", label: "MBA", maxYears: 2 },
  { value: "phd", label: "PhD", maxYears: 5 },
];

const YEAR_LABELS = ["", "First", "Second", "Third", "Fourth", "Fifth"];

export const allProgrammeRules = () => PROGRAMMES.map((programme) => ({
  programme: programme.value,
  years: [],
}));

export function eligibilityForForm(event = {}) {
  const mode = event.eligibilityMode === "all_iitr" ? "all_iitr" : "undergraduate";
  const supplied = Array.isArray(event.programmeEligibility) ? event.programmeEligibility : [];
  if (mode === "all_iitr") {
    return {
      eligibilityMode: mode,
      programmeEligibility: supplied.length ? supplied.map((rule) => ({
        programme: rule.programme,
        years: rule.years || [],
      })) : allProgrammeRules(),
    };
  }
  const undergraduate = supplied.find((rule) => rule.programme === "undergraduate");
  return {
    eligibilityMode: mode,
    programmeEligibility: [{
      programme: "undergraduate",
      years: undergraduate?.years || event.eligibilityYears || [],
    }],
  };
}

export function eligibilitySummary(event = {}) {
  const normalized = eligibilityForForm(event);
  return normalized.programmeEligibility.map((rule) => {
    const label = PROGRAMMES.find((programme) => programme.value === rule.programme)?.label || rule.programme;
    return rule.years?.length
      ? `${label}: ${rule.years.map((year) => `${YEAR_LABELS[year]} year`).join(", ")}`
      : `${label}: all years`;
  }).join(" · ");
}
