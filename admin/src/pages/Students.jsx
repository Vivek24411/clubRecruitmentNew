import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Badge,
  Button,
  Input,
  Field,
  Monogram,
  Modal,
  Page,
  PageHeader,
  Select,
  Skeleton,
  TableWrap,
} from "../components/ui";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [academicOptions, setAcademicOptions] = useState({ branches: [], programmes: [] });
  const [editing, setEditing] = useState(null);
  const [academicForm, setAcademicForm] = useState({ programme: "undergraduate", branch: "", academicYear: 1 });
  const [savingAcademics, setSavingAcademics] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (page = 1, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_BASE_URI}/admin/students`, {
        params: { search, page, limit: 50 },
      });
      if (!data.success) throw new Error(data.msg);
      setStudents((current) => append ? [...current, ...data.students] : data.students);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not load students");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BASE_URI}/admin/settings`)
      .then(({ data }) => setAcademicOptions({
        branches: data.settings?.academicConfiguration?.branches || [],
        programmes: data.settings?.programmes || [],
      }))
      .catch(() => toast.error("Could not load academic options"));
  }, []);

  const openAcademicEditor = (student) => {
    setEditing(student);
    setAcademicForm({
      programme: student.programme || "undergraduate",
      branch: student.branch || academicOptions.branches[0]?.name || "",
      academicYear: Number(student.academicYear) || 1,
    });
  };

  const saveAcademics = async (event) => {
    event.preventDefault();
    setSavingAcademics(true);
    try {
      const { data } = await axios.patch(
        `${import.meta.env.VITE_BASE_URI}/admin/students/${editing._id}/academics`,
        academicForm,
      );
      if (!data.success) throw new Error(data.msg);
      setStudents((items) => items.map((item) => (item._id === editing._id ? data.student : item)));
      setEditing(null);
      toast.success(data.msg);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not update academics");
    } finally {
      setSavingAcademics(false);
    }
  };

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
                      {[academicOptions.programmes.find((programme) => programme.value === (student.programme || "undergraduate"))?.label || "Undergraduate", student.branch, student.year].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td>
                      <Badge tone={suspended ? "bad" : "ok"}>{student.status || "active"}</Badge>
                    </td>
                    <td className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openAcademicEditor(student)}
                      >
                        Correct course
                      </Button>
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
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-ink-3" role="status">Showing <span className="tabular font-semibold text-ink">{students.length}</span> of <span className="tabular font-semibold text-ink">{pagination.total}</span> students.</p>{pagination.page < pagination.pages && <Button variant="secondary" loading={loadingMore} onClick={() => load(pagination.page + 1, true)}>Load more</Button>}</div>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => !savingAcademics && setEditing(null)}
        title="Correct academic details"
        description={editing ? `Update the verified course details for ${editing.name}. This action is recorded in the audit log.` : ""}
      >
        <form onSubmit={saveAcademics} className="space-y-4">
          <Field label="Programme" id="studentProgramme" required>
            <Select id="studentProgramme" value={academicForm.programme} onChange={(event) => setAcademicForm({ programme: event.target.value, branch: "", academicYear: 1 })} required>
              {academicOptions.programmes.map((programme) => <option key={programme.value} value={programme.value}>{programme.label}</option>)}
            </Select>
          </Field>
          <Field label="Branch or discipline" id="studentBranch" required>
            {academicForm.programme === "undergraduate" ? (
              <Select
                id="studentBranch"
                value={academicForm.branch}
                onChange={(event) => {
                  const branch = academicOptions.branches.find((item) => item.name === event.target.value);
                  setAcademicForm({
                    ...academicForm,
                    branch: event.target.value,
                    academicYear: Math.min(academicForm.academicYear, branch?.durationYears || 4),
                  });
                }}
                required
              >
                <option value="">Choose branch/programme</option>
                {academicOptions.branches.map((branch) => (
                  <option key={branch.name} value={branch.name}>{branch.name}</option>
                ))}
              </Select>
            ) : (
              <Input id="studentBranch" value={academicForm.branch} onChange={(event) => setAcademicForm({ ...academicForm, branch: event.target.value })} maxLength={100} required />
            )}
          </Field>
          <Field label="Current year" id="studentYear" required>
            <Select
              id="studentYear"
              value={academicForm.academicYear}
              onChange={(event) => setAcademicForm({ ...academicForm, academicYear: Number(event.target.value) })}
              required
            >
              {Array.from({
                length: academicForm.programme === "undergraduate"
                  ? academicOptions.branches.find((branch) => branch.name === academicForm.branch)?.durationYears || 4
                  : academicOptions.programmes.find((programme) => programme.value === academicForm.programme)?.durationYears || 5,
              }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {['First', 'Second', 'Third', 'Fourth', 'Fifth'][index]} year
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)} disabled={savingAcademics}>
              Cancel
            </Button>
            <Button type="submit" loading={savingAcademics} disabled={!academicForm.branch}>
              Save correction
            </Button>
          </div>
        </form>
      </Modal>
    </Page>
  );
}
