import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { safeExternalUrl } from "../utils/url";
import { Button, Card, EmptyState, Field, Input, Meta, Monogram, Page, Select, Skeleton } from "../components/ui";

/** Club logo with a monogram fallback that survives a broken image URL. */
function ClubMark({ club }) {
  const [failed, setFailed] = useState(false);
  if (!club.clubLogo || failed) return <Monogram name={club.name || "?"} size="lg" />;
  return (
    <img
      src={club.clubLogo}
      alt=""
      onError={() => setFailed(true)}
      className="h-16 w-16 flex-none rounded-md border border-line bg-surface object-contain p-1"
    />
  );
}

/** A prose block that only renders when the club has filled it in. */
function Prose({ title, body }) {
  if (!body) return null;
  return (
    <section className="ruled-top pt-8">
      <h2 className="display text-xl">{title}</h2>
      <p className="mt-4 whitespace-pre-wrap leading-[1.75] text-ink-2">{body}</p>
    </section>
  );
}

function SocialRow({ label, href }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-3 rounded-sm bg-paper-2 px-3.5 py-2.5 text-sm transition-colors duration-300 hover:bg-paper-3"
    >
      <span className="font-medium">{label}</span>
      <span className="text-ink-4">↗</span>
    </a>
  );
}

export default function Club() {
  const [clubDetails, setClubDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const { clubId } = useParams();
  const [saving, setSaving] = useState(false);
  const [clubTypes, setClubTypes] = useState(["cultural", "technical", "departmental", "others"]);

  const fetchClubDetails = useCallback(async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/admin/getClubDetail`, {
        params: { clubId },
      });
      if (response.data.success) setClubDetails(response.data.club);
      else toast.error(response.data.msg);
    } catch (error) {
      console.error("Error fetching club details:", error);
      toast.error("Failed to load club details");
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchClubDetails();
  }, [fetchClubDetails]);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_BASE_URI}/admin/settings`)
      .then(({ data }) => data.success && setClubTypes(data.settings.clubTypes || clubTypes))
      .catch(() => {});
    // The built-in values remain available if settings cannot be loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <Page width="5xl">
        <Skeleton className="h-3 w-24" />
        <div className="mt-8 flex gap-5">
          <Skeleton className="h-16 w-16 rounded-md" />
          <div className="flex-1">
            <Skeleton className="h-9 w-1/2" />
            <Skeleton className="mt-3 h-4 w-2/3" />
          </div>
        </div>
        <Skeleton className="mt-10 h-56 w-full" />
      </Page>
    );
  }

  if (!clubDetails) {
    return (
      <Page width="3xl">
        <EmptyState
          title="Club not found"
          description="This club may have been removed, or the link is incorrect."
          action={<Button to="/clubs" variant="secondary">Back to clubs</Button>}
        />
      </Page>
    );
  }

  const websiteUrl = safeExternalUrl(clubDetails.website);
  const linkedinUrl = safeExternalUrl(clubDetails.linkedin);
  const instagramUrl = safeExternalUrl(clubDetails.instagram);
  const hasSocials = websiteUrl || linkedinUrl || instagramUrl;
  const hasProse =
    clubDetails.longDescription || clubDetails.achivements || clubDetails.recruitmentMethods;

  const saveAccount = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await axios.patch(`${import.meta.env.VITE_BASE_URI}/admin/clubs/${clubId}/details`, {
        accountEmail: clubDetails.accountEmail,
        contactEmail: clubDetails.contactEmail,
        category: clubDetails.category,
      });
      if (!data.success) throw new Error(data.msg);
      setClubDetails(data.club);
      toast.success(data.msg);
    } catch (error) { toast.error(error.response?.data?.msg || error.message); }
    finally { setSaving(false); }
  };

  return (
    <Page width="5xl">
      <Link to="/clubs" className="link text-sm text-ink-3">
        ← All clubs
      </Link>

      <header className="reveal mt-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <ClubMark club={clubDetails} />
          <div className="min-w-0 flex-1">
            <span className="eyebrow eyebrow-accent">Club account</span>
            <h1 className="display mt-2 text-3xl sm:text-4xl">{clubDetails.name}</h1>
            <p className="mt-1.5 text-sm text-ink-3">@{clubDetails.userName}</p>
            {clubDetails.shortDescription && (
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2">
                {clubDetails.shortDescription}
              </p>
            )}
          </div>
        </div>
        <hr className="rule animate-draw mt-8" style={{ animationDelay: "200ms" }} />
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {clubDetails.longDescription && (
            <section>
              <h2 className="display text-xl">About</h2>
              <p className="mt-4 whitespace-pre-wrap leading-[1.75] text-ink-2">
                {clubDetails.longDescription}
              </p>
            </section>
          )}
          <Prose title="Achievements" body={clubDetails.achivements} />
          <Prose title="How they recruit" body={clubDetails.recruitmentMethods} />

          {!hasProse && (
            <p className="text-sm text-ink-3">
              This club hasn&rsquo;t completed its public profile yet.
            </p>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
          <Card as="form" onSubmit={saveAccount} className="p-6">
            <h2 className="eyebrow">Account settings</h2>
            <div className="mt-4 space-y-4">
              <Field label="Club type" id="category"><Select id="category" value={clubDetails.category || "technical"} onChange={(event) => setClubDetails({ ...clubDetails, category: event.target.value })}>{clubTypes.map((type) => <option key={type} value={type}>{type.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>)}</Select></Field>
              <Field label="Recovery email" id="accountEmail" required><Input id="accountEmail" type="email" value={clubDetails.accountEmail || ""} onChange={(event) => setClubDetails({ ...clubDetails, accountEmail: event.target.value })} required /></Field>
              <Field label="Public contact email" id="contactEmail"><Input id="contactEmail" type="email" value={clubDetails.contactEmail || ""} onChange={(event) => setClubDetails({ ...clubDetails, contactEmail: event.target.value })} /></Field>
              <Button size="sm" loading={saving}>Save account</Button>
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="eyebrow">Contact</h2>
            <dl className="mt-4 space-y-4">
              <Meta label="Username" value={clubDetails.userName} />
              <Meta
                label="Email"
                value={
                  clubDetails.contactEmail ? (
                    <a
                      href={`mailto:${clubDetails.contactEmail}`}
                      className="link link-accent break-all"
                    >
                      {clubDetails.contactEmail}
                    </a>
                  ) : null
                }
              />
              <Meta
                label="Phone"
                value={
                  clubDetails.contactPhone ? (
                    <a href={`tel:${clubDetails.contactPhone}`} className="link link-accent">
                      {clubDetails.contactPhone}
                    </a>
                  ) : null
                }
              />
            </dl>
          </Card>

          {hasSocials && (
            <div>
              <h2 className="eyebrow mb-3">Links</h2>
              <div className="space-y-2.5">
                <SocialRow label="Website" href={websiteUrl} />
                <SocialRow label="Instagram" href={instagramUrl} />
                <SocialRow label="LinkedIn" href={linkedinUrl} />
              </div>
            </div>
          )}

          <Button to="/clubs" variant="secondary" block>
            Back to club list
          </Button>
        </aside>
      </div>
    </Page>
  );
}
