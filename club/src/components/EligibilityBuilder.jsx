import { Select } from "./ui";
import { PROGRAMMES } from "../utils/eligibility";

const YEAR_LABELS = ["", "First", "Second", "Third", "Fourth", "Fifth"];

function YearChoices({ maxYears, years, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: maxYears }, (_, index) => index + 1).map((year) => (
        <label key={year} className="flex items-center gap-2 rounded-sm border border-line px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={years.includes(year)}
            onChange={(event) => onChange(event.target.checked
              ? [...years, year].sort((left, right) => left - right)
              : years.filter((item) => item !== year))}
          />
          {YEAR_LABELS[year]} year
        </label>
      ))}
    </div>
  );
}

export default function EligibilityBuilder({ mode, rules, onModeChange, onRulesChange }) {
  const activeRules = Array.isArray(rules) ? rules : [];
  const setMode = (nextMode) => {
    if (nextMode === "all_iitr") {
      const byProgramme = new Map(activeRules.map((rule) => [rule.programme, rule]));
      onRulesChange(PROGRAMMES.map((programme) => byProgramme.get(programme.value) || {
        programme: programme.value,
        years: [],
      }));
    } else {
      const undergraduate = activeRules.find((rule) => rule.programme === "undergraduate");
      onRulesChange([{ programme: "undergraduate", years: undergraduate?.years || [] }]);
    }
    onModeChange(nextMode);
  };

  const updateYears = (programme, years) => onRulesChange(activeRules.map((rule) =>
    rule.programme === programme ? { ...rule, years } : rule));

  const toggleProgramme = (programme, checked) => {
    if (checked) {
      const order = PROGRAMMES.map((item) => item.value);
      onRulesChange([...activeRules, { programme, years: [] }]
        .sort((left, right) => order.indexOf(left.programme) - order.indexOf(right.programme)));
    } else if (activeRules.length > 1) {
      onRulesChange(activeRules.filter((rule) => rule.programme !== programme));
    }
  };

  return (
    <div className="mt-6 space-y-5">
      <div>
        <label className="label" htmlFor="eligibilityMode">Who can register?</label>
        <Select id="eligibilityMode" className="mt-2" value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="undergraduate">Undergraduate students</option>
          <option value="all_iitr">All IITR programmes</option>
        </Select>
        <p className="hint mt-2">Every branch or discipline inside an eligible programme is included automatically.</p>
      </div>

      {mode === "undergraduate" ? (
        <div>
          <p className="label">Eligible undergraduate years</p>
          <div className="mt-2">
            <YearChoices
              maxYears={5}
              years={activeRules.find((rule) => rule.programme === "undergraduate")?.years || []}
              onChange={(years) => updateYears("undergraduate", years)}
            />
          </div>
          <p className="hint mt-2">No year selected means every current undergraduate year.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="label">Eligible programmes and years</p>
            <p className="hint mt-1">All programmes are selected initially. Within each programme, no year selected means every current year.</p>
          </div>
          {PROGRAMMES.map((programme) => {
            const rule = activeRules.find((item) => item.programme === programme.value);
            return (
              <div key={programme.value} className="rounded-sm border border-line p-4">
                <label className="flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(rule)}
                    disabled={Boolean(rule) && activeRules.length === 1}
                    onChange={(event) => toggleProgramme(programme.value, event.target.checked)}
                  />
                  {programme.label}
                </label>
                {rule && (
                  <div className="mt-3">
                    <YearChoices
                      maxYears={programme.maxYears}
                      years={rule.years || []}
                      onChange={(years) => updateYears(programme.value, years)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
