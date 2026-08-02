import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

export default function Clubs() {
  const [clubs, setClubs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [resetClub, setResetClub] = useState(null);
  const [passwords, setPasswords] = useState({ password: "", confirmation: "" });
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_BASE_URI}/admin/getAllClubs`)
      .then(({ data }) => data.success ? setClubs(data.clubs) : toast.error(data.msg))
      .catch(() => toast.error("Could not load clubs"))
      .finally(() => setLoading(false));
  }, []);

  const setStatus = async (club, status) => {
    if (status === "suspended" && !window.confirm(`Suspend ${club.name}? Club staff will be signed out.`)) return;
    try {
      const { data } = await axios.patch(`${import.meta.env.VITE_BASE_URI}/admin/clubs/${club._id}/status`, { status });
      if (!data.success) throw new Error(data.msg);
      setClubs((items) => items.map((item) => item._id === club._id ? data.club : item));
      toast.success(data.msg);
    } catch (error) { toast.error(error.response?.data?.msg || error.message); }
  };

  const closeReset = () => {
    setResetClub(null);
    setPasswords({ password: "", confirmation: "" });
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    if (passwords.password !== passwords.confirmation) return toast.error("Passwords do not match");
    setResetting(true);
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_BASE_URI}/admin/clubs/${resetClub._id}/reset-password`, { newPassword: passwords.password });
      if (!data.success) throw new Error(data.msg);
      toast.success(data.msg);
      closeReset();
    } catch (error) { toast.error(error.response?.data?.msg || error.message); }
    finally { setResetting(false); }
  };

  const filtered = clubs.filter((club) => `${club.name} ${club.userName}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-bold">Clubs</h1><p className="mt-1 text-slate-600">Provision club accounts, review profiles, and control access.</p></div>
      <div className="flex flex-wrap gap-3"><input aria-label="Search clubs" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clubs" className="rounded-lg border border-slate-300 px-3 py-2" /><Link to="/addClub" className="rounded-lg bg-[#1a4b8e] px-4 py-2 font-semibold text-white">Add club</Link></div>
    </div>
    {loading ? <p className="mt-8" role="status">Loading clubs…</p> : filtered.length === 0 ? <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">No clubs match this search.</p> : <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((club) => <article key={club._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">{club.clubLogo ? <img src={club.clubLogo} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className="grid h-12 w-12 place-items-center rounded-lg bg-blue-100 font-bold text-[#1a4b8e]">{club.name?.[0]}</div>}<div className="min-w-0 flex-1"><h2 className="truncate text-lg font-bold">{club.name}</h2><p className="truncate text-sm text-slate-500">@{club.userName}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${club.status === "suspended" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>{club.status || "active"}</span></div>
        <p className="mt-4 line-clamp-2 min-h-10 text-sm text-slate-600">{club.shortDescription || "Profile not completed."}</p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold"><Link to={`/club/${club._id}`} className="text-[#1a4b8e]">View profile</Link><button onClick={() => setStatus(club, club.status === "suspended" ? "active" : "suspended")} className={club.status === "suspended" ? "text-emerald-700" : "text-red-700"}>{club.status === "suspended" ? "Restore" : "Suspend"}</button><button onClick={() => setResetClub(club)} className="text-slate-700">Reset password</button></div>
      </article>)}
    </div>}

    {resetClub && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="reset-password-title">
      <form onSubmit={resetPassword} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="reset-password-title" className="text-xl font-bold">Reset {resetClub.name} password</h2>
        <p className="mt-2 text-sm text-slate-600">The club will be signed out everywhere after this change.</p>
        <label className="mt-5 block text-sm font-medium">New password<input autoFocus type="password" autoComplete="new-password" minLength={10} maxLength={72} required value={passwords.password} onChange={(e) => setPasswords({ ...passwords, password: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="mt-4 block text-sm font-medium">Confirm password<input type="password" autoComplete="new-password" minLength={10} maxLength={72} required value={passwords.confirmation} onChange={(e) => setPasswords({ ...passwords, confirmation: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={closeReset} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold">Cancel</button><button disabled={resetting} className="rounded-lg bg-[#1a4b8e] px-4 py-2 font-semibold text-white disabled:opacity-50">{resetting ? "Resetting…" : "Reset password"}</button></div>
      </form>
    </div>}
  </div>;
}
