import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Badge, Button, Card, Field, Input, Page, PageHeader, Select, Skeleton, Textarea } from "../components/ui";

const localDateTimeValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const BUILT_IN_CLUB_TYPES = ["cultural", "technical", "departmental", "others"];
const clubTypeLabel = (value) => String(value || "").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

/** Styled checkbox matching the paper/ink system. */
function Check({ checked, onChange }) {
  return (
    <span className="relative flex h-4 w-4 flex-none items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer absolute inset-0 cursor-pointer opacity-0"
      />
      <span className="h-4 w-4 rounded-xs border border-line-2 bg-surface transition-all duration-200 peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/30" />
      <svg
        viewBox="0 0 12 12"
        className="pointer-events-none absolute h-3 w-3 scale-50 text-white opacity-0 transition-all duration-200 peer-checked:scale-100 peer-checked:opacity-100"
        aria-hidden="true"
      >
        <path
          d="M2.5 6.2l2.3 2.3 4.7-4.9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </span>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState({
    registrationEnabled: true,
    maintenanceMessage: "",
    recruitmentCycle: { name: "", status: "open", startAt: "", endAt: "" },
    clubTypes: BUILT_IN_CLUB_TYPES,
    academicConfiguration: { rolloverMonth: 6, rolloverDay: 1, branches: [] },
  });
  const [newClubType, setNewClubType] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BASE_URI}/admin/settings`)
      .then(({ data }) => {
        if (data.success)
          setSettings({
            ...data.settings,
            clubTypes: data.settings.clubTypes || BUILT_IN_CLUB_TYPES,
            academicConfiguration: {
              rolloverMonth: data.settings.academicConfiguration?.rolloverMonth || 6,
              rolloverDay: data.settings.academicConfiguration?.rolloverDay || 1,
              branches: data.settings.academicConfiguration?.branches || [],
            },
            recruitmentCycle: {
              ...data.settings.recruitmentCycle,
              startAt: localDateTimeValue(data.settings.recruitmentCycle?.startAt),
              endAt: localDateTimeValue(data.settings.recruitmentCycle?.endAt),
            },
          });
      })
      .catch(() => toast.error("Could not load settings"))
      .finally(() => setLoading(false));
  }, []);

  const setCycle = (key) => (event) =>
    setSettings((prev) => ({
      ...prev,
      recruitmentCycle: { ...prev.recruitmentCycle, [key]: event.target.value },
    }));

  const save = async (event) => {
    event.preventDefault();
    if (
      settings.recruitmentCycle.startAt &&
      settings.recruitmentCycle.endAt &&
      new Date(settings.recruitmentCycle.startAt) >= new Date(settings.recruitmentCycle.endAt)
    )
      return toast.error("Cycle end must be after its start");

    setSaving(true);
    try {
      const payload = {
        ...settings,
        recruitmentCycle: {
          ...settings.recruitmentCycle,
          startAt: settings.recruitmentCycle.startAt
            ? new Date(settings.recruitmentCycle.startAt).toISOString()
            : null,
          endAt: settings.recruitmentCycle.endAt
            ? new Date(settings.recruitmentCycle.endAt).toISOString()
            : null,
        },
      };
      const { data } = await axios.patch(
        `${import.meta.env.VITE_BASE_URI}/admin/settings`,
        payload,
      );
      if (!data.success) throw new Error(data.msg);
      toast.success(data.msg);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Page width="3xl">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-6 h-10 w-1/2" />
        <Skeleton className="mt-10 h-80 w-full" />
      </Page>
    );
  }

  const accepting = settings.registrationEnabled;
  const updateBranch = (index, changes) => setSettings({
    ...settings,
    academicConfiguration: {
      ...settings.academicConfiguration,
      branches: settings.academicConfiguration.branches.map((branch, current) => current === index ? { ...branch, ...changes } : branch),
    },
  });
  const addClubType = () => {
    const normalized = newClubType.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (normalized.length < 2) return toast.error("Enter a club type name");
    if (settings.clubTypes.includes(normalized)) return toast.error("That club type already exists");
    setSettings({ ...settings, clubTypes: [...settings.clubTypes, normalized] });
    setNewClubType("");
  };

  return (
    <Page width="3xl">
      <PageHeader
        eyebrow="Platform control"
        title="Recruitment cycle"
        description="Control the platform-wide application window and the notice students see."
        actions={
          accepting ? (
            <Badge tone="ok" live>
              Accepting applications
            </Badge>
          ) : (
            <Badge tone="bad">Applications paused</Badge>
          )
        }
      />

      <form onSubmit={save} className="mt-10 space-y-6">
        {/* Master switch --------------------------------------------------- */}
        <Card
          className={`reveal p-6 transition-colors duration-500 ${
            accepting ? "" : "border-bad"
          }`}
        >
          <label className="flex cursor-pointer items-start gap-3.5">
            <span className="pt-0.5">
              <Check
                checked={accepting}
                onChange={(event) =>
                  setSettings({ ...settings, registrationEnabled: event.target.checked })
                }
              />
            </span>
            <span>
              <span className="block font-semibold">Accept new applications</span>
              <span className="mt-1 block text-sm leading-relaxed text-ink-3">
                Turning this off blocks every event registration across the platform immediately.
                Existing applications are unaffected.
              </span>
            </span>
          </label>
        </Card>

        {/* Cycle ----------------------------------------------------------- */}
        <Card className="reveal p-6" style={{ "--d": "80ms" }}>
          <h2 className="display text-xl">Cycle window</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Cycle name" id="cycleName" hint="Shown to students on the home page.">
              <Input
                id="cycleName"
                value={settings.recruitmentCycle.name || ""}
                onChange={setCycle("name")}
                placeholder="e.g. Autumn 2026"
              />
            </Field>

            <Field label="Cycle status" id="cycleStatus">
              <Select
                id="cycleStatus"
                value={settings.recruitmentCycle.status}
                onChange={setCycle("status")}
              >
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </Select>
            </Field>

            <Field label="Starts at" id="startAt">
              <Input
                id="startAt"
                type="datetime-local"
                value={settings.recruitmentCycle.startAt || ""}
                onChange={setCycle("startAt")}
              />
            </Field>

            <Field label="Ends at" id="endAt">
              <Input
                id="endAt"
                type="datetime-local"
                value={settings.recruitmentCycle.endAt || ""}
                onChange={setCycle("endAt")}
              />
            </Field>
          </div>
        </Card>

        {/* Notice ---------------------------------------------------------- */}
        <Card className="reveal p-6" style={{ "--d": "150ms" }}>
          <h2 className="display text-xl">Student notice</h2>
          <Field
            label="Announcement"
            id="maintenanceMessage"
            className="mt-6"
            hint="Optional. Appears as a banner on the student home page."
          >
            <Textarea
              id="maintenanceMessage"
              rows="3"
              className="min-h-0"
              value={settings.maintenanceMessage || ""}
              onChange={(event) =>
                setSettings({ ...settings, maintenanceMessage: event.target.value })
              }
              placeholder="e.g. Round 2 interview slots open on Monday."
            />
          </Field>
        </Card>

        <Card className="reveal p-6" style={{ "--d": "170ms" }}>
          <h2 className="display text-xl">Club types</h2>
          <p className="mt-1.5 text-sm text-ink-3">Technical, cultural, departmental, and others are always available. Add more types for the club directory and admin forms.</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Input value={newClubType} onChange={(event) => setNewClubType(event.target.value)} placeholder="e.g. Sports" maxLength={50} />
            <Button type="button" variant="secondary" onClick={addClubType}>Add type</Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {settings.clubTypes.map((type) => (
              <span key={type} className="badge badge-neutral flex items-center gap-2">
                {clubTypeLabel(type)}
                {!BUILT_IN_CLUB_TYPES.includes(type) && (
                  <button type="button" aria-label={`Remove ${clubTypeLabel(type)}`} onClick={() => setSettings({ ...settings, clubTypes: settings.clubTypes.filter((item) => item !== type) })}>×</button>
                )}
              </span>
            ))}
          </div>
        </Card>

        <Card className="reveal p-6" style={{ "--d": "190ms" }}>
          <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="display text-xl">Undergraduate programmes</h2><p className="mt-1.5 text-sm text-ink-3">Manage undergraduate branches/programmes and their duration. Every student's year advances at the annual June rollover.</p></div><Button type="button" variant="secondary" size="sm" onClick={() => setSettings({ ...settings, academicConfiguration: { ...settings.academicConfiguration, branches: [...settings.academicConfiguration.branches, { name: "", durationYears: 4 }] } })}>Add undergraduate programme</Button></div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Rollover month" id="rolloverMonth"><Select id="rolloverMonth" value={settings.academicConfiguration.rolloverMonth} onChange={(event) => setSettings({ ...settings, academicConfiguration: { ...settings.academicConfiguration, rolloverMonth: Number(event.target.value) } })}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Date(2026, index, 1).toLocaleString("en", { month: "long" })}</option>)}</Select></Field>
            <Field label="Rollover day" id="rolloverDay"><Input id="rolloverDay" type="number" min="1" max="28" value={settings.academicConfiguration.rolloverDay} onChange={(event) => setSettings({ ...settings, academicConfiguration: { ...settings.academicConfiguration, rolloverDay: Number(event.target.value) } })} /></Field>
          </div>
          <div className="mt-6 space-y-3">{settings.academicConfiguration.branches.map((branch, index) => <div key={branch._id || index} className="grid gap-3 sm:grid-cols-[1fr_10rem_auto]"><Input aria-label={`Undergraduate programme ${index + 1} name`} value={branch.name} onChange={(event) => updateBranch(index, { name: event.target.value })} placeholder="Branch or programme name" required /><Select aria-label={`Undergraduate programme ${index + 1} duration`} value={branch.durationYears || 4} onChange={(event) => updateBranch(index, { durationYears: Number(event.target.value) })}><option value="4">4-year course</option><option value="5">5-year course</option></Select><Button type="button" variant="danger" size="sm" onClick={() => setSettings({ ...settings, academicConfiguration: { ...settings.academicConfiguration, branches: settings.academicConfiguration.branches.filter((_, current) => current !== index) } })}>Remove</Button></div>)}</div>
        </Card>

        <Button type="submit" size="lg" loading={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </form>
    </Page>
  );
}
