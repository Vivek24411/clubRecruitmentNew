import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_BASE_URI}/admin/students`, { params: { search, limit: 100 } });
      if (!data.success) throw new Error(data.msg);
      setStudents(data.students);
    } catch (error) { toast.error(error.response?.data?.msg || error.message || "Could not load students"); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);

  const setStatus = async (student, status) => {
    if (status === "suspended" && !window.confirm(`Suspend ${student.name}? Their active sessions will be revoked.`)) return;
    try {
      const { data } = await axios.patch(`${import.meta.env.VITE_BASE_URI}/admin/students/${student._id}/status`, { status });
      if (!data.success) throw new Error(data.msg);
      setStudents((items) => items.map((item) => item._id === student._id ? data.student : item));
      toast.success(data.msg);
    } catch (error) { toast.error(error.response?.data?.msg || error.message); }
  };

  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold">Students</h1><p className="mt-1 text-slate-600">Search accounts and revoke access when needed.</p></div><label className="text-sm font-medium">Search students<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, enrollment" className="mt-1 block w-72 max-w-full rounded-lg border border-slate-300 px-3 py-2" /></label></div>
    <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Student</th><th className="p-4">Enrollment</th><th className="p-4">Course</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead><tbody>
        {loading ? <tr><td colSpan="5" className="p-8 text-center">Loading students…</td></tr> : students.length === 0 ? <tr><td colSpan="5" className="p-8 text-center text-slate-500">No students found.</td></tr> : students.map((student) => <tr key={student._id} className="border-t border-slate-100"><td className="p-4"><p className="font-semibold">{student.name}</p><p className="text-slate-500">{student.email}</p></td><td className="p-4">{student.enrollmentNumber}</td><td className="p-4">{student.branch} · {student.year}</td><td className="p-4"><span className={`rounded-full px-2.5 py-1 font-semibold ${student.status === "suspended" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>{student.status || "active"}</span></td><td className="p-4"><button onClick={() => setStatus(student, student.status === "suspended" ? "active" : "suspended")} className={`font-semibold ${student.status === "suspended" ? "text-emerald-700" : "text-red-700"}`}>{student.status === "suspended" ? "Restore" : "Suspend"}</button></td></tr>)}
      </tbody></table>
    </div>
  </div>;
}
