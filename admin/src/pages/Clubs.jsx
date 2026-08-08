import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  Modal,
  Monogram,
  Page,
  PageHeader,
  Skeleton,
} from "../components/ui";

/** Club logo with a monogram fallback that survives a broken image URL. */
function ClubMark({ club }) {
  const [failed, setFailed] = useState(false);
  if (!club.clubLogo || failed) return <Monogram name={club.name || "?"} size="md" />;
  return (
    <img
      src={club.clubLogo}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-12 w-12 flex-none rounded-md border border-line object-cover"
    />
  );
}

export default function Clubs() {
  const [clubs, setClubs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [resetClub, setResetClub] = useState(null);
  const [passwords, setPasswords] = useState({ password: "", confirmation: "" });
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BASE_URI}/admin/getAllClubs`)
      .then(({ data }) => (data.success ? setClubs(data.clubs) : toast.error(data.msg)))
      .catch(() => toast.error("Could not load clubs"))
      .finally(() => setLoading(false));
  }, []);

  const setStatus = async (club, status) => {
    if (
      status === "suspended" &&
      !window.confirm(`Suspend ${club.name}? Club staff will be signed out.`)
    )
      return;
    try {
      const { data } = await axios.patch(
        `${import.meta.env.VITE_BASE_URI}/admin/clubs/${club._id}/status`,
        { status },
      );
      if (!data.success) throw new Error(data.msg);
      setClubs((items) => items.map((item) => (item._id === club._id ? data.club : item)));
      toast.success(data.msg);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message);
    }
  };

  const closeReset = () => {
    setResetClub(null);
    setPasswords({ password: "", confirmation: "" });
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    if (passwords.password !== passwords.confirmation)
      return toast.error("Passwords do not match");
    setResetting(true);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/admin/clubs/${resetClub._id}/reset-password`,
        { newPassword: passwords.password },
      );
      if (!data.success) throw new Error(data.msg);
      toast.success(data.msg);
      closeReset();
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message);
    } finally {
      setResetting(false);
    }
  };

  const filtered = useMemo(
    () =>
      clubs.filter((club) =>
        `${club.name} ${club.userName}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [clubs, search],
  );

  return (
    <Page>
      <PageHeader
        eyebrow="Accounts"
        title="Clubs"
        description="Provision club accounts, review profiles, and control access."
        actions={
          <>
            <Input
              aria-label="Search clubs"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search clubs…"
              className="w-full sm:w-56"
            />
            <Button to="/addClub" variant="accent">
              Add club
            </Button>
          </>
        }
      />

      <div className="mt-8">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="card p-5">
                <Skeleton className="h-12 w-12 rounded-md" />
                <Skeleton className="mt-4 h-5 w-2/3" />
                <Skeleton className="mt-3 h-3 w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={clubs.length === 0 ? "No clubs yet" : "No matching clubs"}
            description={
              clubs.length === 0
                ? "Provision the first club account to get recruitment started."
                : "Try a different name or username."
            }
            action={
              clubs.length === 0 ? (
                <Button to="/addClub">Add a club</Button>
              ) : (
                <Button variant="secondary" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              )
            }
          />
        ) : (
          <div className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((club) => {
              const suspended = club.status === "suspended";
              return (
                <article key={club._id} className="card flex flex-col p-5">
                  <div className="flex items-start gap-3.5">
                    <ClubMark club={club} />
                    <div className="min-w-0 flex-1">
                      <h2 className="display truncate text-lg leading-snug">{club.name}</h2>
                      <p className="truncate text-sm text-ink-3">@{club.userName}</p>
                    </div>
                    <Badge tone={suspended ? "bad" : "ok"}>{club.status || "active"}</Badge>
                  </div>

                  <p className="mt-4 line-clamp-2 min-h-10 flex-1 text-sm leading-relaxed text-ink-3">
                    {club.shortDescription || "Profile not completed."}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-sm font-semibold">
                    <Link to={`/club/${club._id}`} className="link link-accent">
                      View profile
                    </Link>
                    <button
                      onClick={() => setStatus(club, suspended ? "active" : "suspended")}
                      className={`link ${suspended ? "text-ok" : "text-bad"}`}
                    >
                      {suspended ? "Restore" : "Suspend"}
                    </button>
                    <button onClick={() => setResetClub(club)} className="link ml-auto text-ink-2">
                      Reset password
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Password reset ---------------------------------------------------- */}
      <Modal
        open={Boolean(resetClub)}
        onClose={closeReset}
        title={`Reset ${resetClub?.name || ""} password`}
        description="The club will be signed out everywhere after this change."
        labelledBy="reset-password-title"
      >
        <form onSubmit={resetPassword} className="space-y-5">
          <Field label="New password" id="new-password" required hint="At least 10 characters.">
            <Input
              id="new-password"
              autoFocus
              type="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={72}
              required
              value={passwords.password}
              onChange={(event) => setPasswords({ ...passwords, password: event.target.value })}
            />
          </Field>

          <Field
            label="Confirm password"
            id="confirm-password"
            required
            error={
              passwords.confirmation && passwords.confirmation !== passwords.password
                ? "Passwords do not match."
                : undefined
            }
          >
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={72}
              required
              value={passwords.confirmation}
              onChange={(event) =>
                setPasswords({ ...passwords, confirmation: event.target.value })
              }
            />
          </Field>

          <div className="flex justify-end gap-3 border-t border-line pt-5">
            <Button type="button" variant="secondary" onClick={closeReset}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={resetting}>
              {resetting ? "Resetting…" : "Reset password"}
            </Button>
          </div>
        </form>
      </Modal>
    </Page>
  );
}
