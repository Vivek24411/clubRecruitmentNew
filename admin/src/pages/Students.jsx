import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Badge,
  Button,
  Input,
  Monogram,
  Page,
  PageHeader,
  Skeleton,
  TableWrap,
} from "../components/ui";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_BASE_URI}/admin/students`, {
        params: { search, limit: 100 },
      });
      if (!data.success) throw new Error(data.msg);
      setStudents(data.students);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not load students");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const setStatus = async (student, status) => {
    if (
      status === "suspended" &&
      !window.confirm(`Suspend ${student.name}? Their active sessions will be revoked.`)
    )
      return;
    try {
      const { data } = await axios.patch(
        `${import.meta.env.VITE_BASE_URI}/admin/students/${student._id}/status`,
        { status },
      );
      if (!data.success) throw new Error(data.msg);
      setStudents((items) =>
        items.map((item) => (item._id === student._id ? data.student : item)),
      );
      toast.success(data.msg);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message);
    }
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Accounts"
        title="Students"
        description="Search registered accounts and revoke access when needed."
        actions={
          <Input
            aria-label="Search students"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, email, or enrollment…"
            className="w-full sm:w-72"
          />
        }
      />

      <TableWrap className="mt-8">
        <table className="table min-w-[48rem]">
          <thead>
            <tr>
              <th>Student</th>
              <th>Enrollment</th>
              <th>Course</th>
              <th>Status</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <tr key={index}>
                  <td colSpan="5">
                    <Skeleton className="h-8 w-full" />
                  </td>
                </tr>
              ))
            ) : students.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-14 text-center text-sm text-ink-3">
                  {search ? "No students match that search." : "No students registered yet."}
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const suspended = student.status === "suspended";
                return (
                  <tr key={student._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Monogram name={student.name || "?"} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{student.name}</p>
                          <p className="truncate text-xs text-ink-3">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="tabular">{student.enrollmentNumber || "—"}</td>
                    <td className="text-ink-2">
                      {[student.branch, student.year].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td>
                      <Badge tone={suspended ? "bad" : "ok"}>{student.status || "active"}</Badge>
                    </td>
                    <td className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className={suspended ? "text-ok" : "text-bad"}
                        onClick={() => setStatus(student, suspended ? "active" : "suspended")}
                      >
                        {suspended ? "Restore" : "Suspend"}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableWrap>

      {!loading && students.length > 0 && (
        <p className="mt-4 text-sm text-ink-3" role="status">
          Showing <span className="tabular font-semibold text-ink">{students.length}</span>{" "}
          {students.length === 1 ? "student" : "students"}
          {students.length === 100 ? " (first 100 — refine your search)" : ""}.
        </p>
      )}
    </Page>
  );
}
