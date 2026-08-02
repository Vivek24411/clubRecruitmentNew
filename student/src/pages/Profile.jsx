import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { StudentContextData } from "../context/StudentContext";

const fieldClass = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export default function Profile() {
  const { profile, setProfile, signOut } = useContext(StudentContextData);
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", branch: "", year: "", phoneNumber: "", notificationPreferences: { email: true, inApp: true } });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setForm({ name: profile.name || "", branch: profile.branch || "", year: profile.year || "", phoneNumber: profile.phoneNumber || "", notificationPreferences: { email: profile.notificationPreferences?.email !== false, inApp: profile.notificationPreferences?.inApp !== false } });
  }, [profile]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await axios.patch(`${import.meta.env.VITE_BASE_URI}/student/profile`, form);
      if (!data.success) throw new Error(data.msg);
      setProfile(data.student);
      toast.success(data.msg);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not save profile");
    } finally { setSaving(false); }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) return toast.error("New passwords do not match");
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_BASE_URI}/student/changePassword`, { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      if (!data.success) throw new Error(data.msg);
      toast.success(data.msg);
      await signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not change password");
    }
  };

  return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <h1 className="text-3xl font-bold">Profile and account</h1>
    <p className="mt-1 text-slate-600">Keep your recruitment contact details accurate.</p>
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <aside className="rounded-xl bg-[#1a4b8e] p-6 text-white">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-2xl font-bold text-[#1a4b8e]">{profile?.name?.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div>
        <h2 className="mt-4 text-xl font-bold">{profile?.name}</h2>
        <p className="mt-1 break-all text-blue-100">{profile?.email}</p>
        <p className="mt-4 text-sm text-blue-100">Enrollment</p><p>{profile?.enrollmentNumber}</p>
      </aside>
      <div className="space-y-6 lg:col-span-2">
        <form onSubmit={saveProfile} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Personal details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[['name','Full name'],['branch','Branch'],['year','Year'],['phoneNumber','Phone number']].map(([key, label]) => <label key={key} className="text-sm font-medium text-slate-700">{label}<input className={fieldClass} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required /></label>)}
          </div>
          <fieldset className="mt-5 rounded-lg bg-slate-50 p-4"><legend className="px-1 text-sm font-semibold text-slate-700">Recruitment notifications</legend><div className="mt-2 flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.notificationPreferences.inApp} onChange={(e) => setForm({ ...form, notificationPreferences: { ...form.notificationPreferences, inApp: e.target.checked } })} /> In-app alerts</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.notificationPreferences.email} onChange={(e) => setForm({ ...form, notificationPreferences: { ...form.notificationPreferences, email: e.target.checked } })} /> Email updates</label></div></fieldset>
          <button disabled={saving} className="mt-5 rounded-lg bg-[#1a4b8e] px-4 py-2 font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button>
        </form>
        <form onSubmit={changePassword} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Change password</h2>
          <p className="mt-1 text-sm text-slate-600">Changing it signs you out of every active session.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[['currentPassword','Current password'],['newPassword','New password'],['confirmPassword','Confirm new password']].map(([key, label]) => <label key={key} className="text-sm font-medium text-slate-700">{label}<input type="password" minLength={key === 'currentPassword' ? 1 : 10} maxLength={key === 'currentPassword' ? 128 : 72} className={fieldClass} value={passwords[key]} onChange={(e) => setPasswords({ ...passwords, [key]: e.target.value })} required autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'} /></label>)}
          </div>
          <button className="mt-5 rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50">Update password</button>
        </form>
      </div>
    </div>
  </div>;
}
