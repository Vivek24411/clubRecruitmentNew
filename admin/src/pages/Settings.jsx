import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2";
const localDateTimeValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function Settings() {
  const [settings, setSettings] = useState({ registrationEnabled: true, maintenanceMessage: "", recruitmentCycle: { name: "", status: "open", startAt: "", endAt: "" } });
  const [loading, setLoading] = useState(true);

  useEffect(() => { axios.get(`${import.meta.env.VITE_BASE_URI}/admin/settings`).then(({ data }) => {
    if (data.success) setSettings({ ...data.settings, recruitmentCycle: { ...data.settings.recruitmentCycle, startAt: localDateTimeValue(data.settings.recruitmentCycle?.startAt), endAt: localDateTimeValue(data.settings.recruitmentCycle?.endAt) } });
  }).catch(() => toast.error("Could not load settings")).finally(() => setLoading(false)); }, []);

  const save = async (event) => {
    event.preventDefault();
    if (settings.recruitmentCycle.startAt && settings.recruitmentCycle.endAt && new Date(settings.recruitmentCycle.startAt) >= new Date(settings.recruitmentCycle.endAt)) return toast.error("Cycle end must be after its start");
    try {
      const payload = { ...settings, recruitmentCycle: { ...settings.recruitmentCycle, startAt: settings.recruitmentCycle.startAt ? new Date(settings.recruitmentCycle.startAt).toISOString() : null, endAt: settings.recruitmentCycle.endAt ? new Date(settings.recruitmentCycle.endAt).toISOString() : null } };
      const { data } = await axios.patch(`${import.meta.env.VITE_BASE_URI}/admin/settings`, payload);
      if (!data.success) throw new Error(data.msg);
      toast.success(data.msg);
    } catch (error) { toast.error(error.response?.data?.msg || error.message || "Could not save settings"); }
  };

  if (loading) return <div className="p-8" role="status">Loading recruitment settings…</div>;
  return <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6"><h1 className="text-3xl font-bold">Recruitment cycle</h1><p className="mt-1 text-slate-600">Control the platform-wide application window and student-facing notice.</p><form onSubmit={save} className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-4"><input type="checkbox" className="mt-1 h-4 w-4" checked={settings.registrationEnabled} onChange={(e) => setSettings({ ...settings, registrationEnabled: e.target.checked })} /><span><span className="block font-semibold">Accept new applications</span><span className="text-sm text-slate-600">Turning this off blocks every event registration immediately.</span></span></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Cycle name<input className={inputClass} value={settings.recruitmentCycle.name || ""} onChange={(e) => setSettings({ ...settings, recruitmentCycle: { ...settings.recruitmentCycle, name: e.target.value } })} /></label><label className="text-sm font-medium">Cycle status<select className={inputClass} value={settings.recruitmentCycle.status} onChange={(e) => setSettings({ ...settings, recruitmentCycle: { ...settings.recruitmentCycle, status: e.target.value } })}><option value="draft">Draft</option><option value="open">Open</option><option value="closed">Closed</option></select></label><label className="text-sm font-medium">Starts at<input type="datetime-local" className={inputClass} value={settings.recruitmentCycle.startAt || ""} onChange={(e) => setSettings({ ...settings, recruitmentCycle: { ...settings.recruitmentCycle, startAt: e.target.value } })} /></label><label className="text-sm font-medium">Ends at<input type="datetime-local" className={inputClass} value={settings.recruitmentCycle.endAt || ""} onChange={(e) => setSettings({ ...settings, recruitmentCycle: { ...settings.recruitmentCycle, endAt: e.target.value } })} /></label></div>
    <label className="block text-sm font-medium">Student notice<textarea rows="3" className={inputClass} value={settings.maintenanceMessage || ""} onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })} placeholder="Optional announcement shown during recruitment" /></label>
    <button className="rounded-lg bg-[#1a4b8e] px-4 py-2 font-semibold text-white">Save settings</button>
  </form></div>;
}
