import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { safeExternalUrl } from "../utils/url";
import { Button, Card, EmptyState, Monogram, Page, Skeleton } from "../components/ui";

/** Club logo with a monogram fallback that survives a broken image URL. */
function ClubMark({ club }) {
  const [failed, setFailed] = useState(false);
  if (!club.clubLogo || failed) return <Monogram name={club.name} size="lg" />;
  return (
    <img
      src={club.clubLogo}
      alt=""
      onError={() => setFailed(true)}
      className="h-16 w-16 flex-none rounded-md border border-line object-cover"
    />
  );
}

/** A prose block that only renders when there is something to say. */
function Prose({ title, body }) {
  if (!body) return null;
  return (
    <section className="ruled-top pt-8">
      <h2 className="display text-xl">{title}</h2>
      <p className="mt-4 whitespace-pre-wrap leading-[1.75] text-ink-2">{body}</p>
    </section>
  );
}

const SOCIAL_ICONS = {
  Website: (
    <path
      d="M2 10h16M10 2a14 14 0 010 16M10 2a14 14 0 000 16M10 2a8 8 0 100 16 8 8 0 000-16z"
      stroke="currentColor"
      strokeWidth="1.4"
      fill="none"
    />
  ),
  Instagram: (
    <>
      <rect x="3" y="3" width="14" height="14" rx="4" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <circle cx="10" cy="10" r="3.4" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <circle cx="14.2" cy="5.8" r="0.9" fill="currentColor" />
    </>
  ),
  LinkedIn: (
    <>
      <rect x="3" y="3" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M6.4 8.6V14M6.4 6.2v.1M9.6 14V8.6M9.6 11c0-2.4 3.9-2.6 3.9.3V14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </>
  ),
};

function SocialLink({ label, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="card card-interactive flex items-center gap-3 px-4 py-3"
    >
      <svg viewBox="0 0 20 20" className="h-5 w-5 flex-none text-accent" aria-hidden="true">
        {SOCIAL_ICONS[label]}
      </svg>
      <span className="text-sm font-medium">{label}</span>
      <span className="ml-auto text-ink-4">↗</span>
    </a>
  );
}

export default function Club() {
  const [club, setClub] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { clubId } = useParams();

  const fetchClub = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/student/getClub`, {
        params: { clubId },
      });
      if (response.data.success) setClub(response.data.club);
      else toast.error(response.data.msg);
    } catch {
      toast.error("Failed to load club");
    } finally {
      setIsLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchClub();
  }, [fetchClub]);

  if (isLoading) {
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
        <Skeleton className="mt-10 h-48 w-full" />
      </Page>
    );
  }

  if (!club) {
    return (
      <Page width="3xl">
        <EmptyState
          title="Club not found"
          description="This club may have been removed, or the link is incorrect."
          action={
            <Button to="/clubs" variant="secondary">
              Back to clubs
            </Button>
          }
        />
      </Page>
    );
  }

  const websiteUrl = safeExternalUrl(club.website);
  const instagramUrl = safeExternalUrl(club.instagram);
  const linkedinUrl = safeExternalUrl(club.linkedin);
  const hasSocials = websiteUrl || instagramUrl || linkedinUrl;

  return (
    <Page width="5xl">
      <Link to="/clubs" className="link text-sm text-ink-3">
        ← All clubs
      </Link>

      {/* ------------------------------------------------------------------ */}
      {/* Masthead                                                            */}
      {/* ------------------------------------------------------------------ */}
      <header className="reveal mt-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <ClubMark club={club} />
          <div className="min-w-0 flex-1">
            <p className="eyebrow eyebrow-accent">Student club</p>
            <h1 className="display mt-2 text-3xl sm:text-4xl">{club.name}</h1>
            {club.shortDescription && (
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2">
                {club.shortDescription}
              </p>
            )}
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <Button to={`/events/club/${clubId}`}>Recruitment events</Button>
          <Button to={`/sessions/club/${clubId}`} variant="secondary">
            Information sessions
          </Button>
        </div>

        <hr className="rule animate-draw mt-8" style={{ animationDelay: "200ms" }} />
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Body                                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {club.longDescription && (
            <section>
              <h2 className="display text-xl">About</h2>
              <p className="mt-4 whitespace-pre-wrap leading-[1.75] text-ink-2">
                {club.longDescription}
              </p>
            </section>
          )}
          <Prose title="Achievements" body={club.achivements} />
          <Prose title="How they recruit" body={club.recruitmentMethods} />

          {!club.longDescription && !club.achivements && !club.recruitmentMethods && (
            <p className="text-sm text-ink-3">
              This club hasn&rsquo;t published a description yet.
            </p>
          )}
        </div>

        {/* Contact rail */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
          {(club.contactEmail || club.contactPhone) && (
            <Card className="p-6">
              <h2 className="eyebrow">Get in touch</h2>
              <dl className="mt-4 space-y-4">
                {club.contactEmail && (
                  <div>
                    <dt className="text-xs text-ink-3">Email</dt>
                    <dd className="mt-1">
                      <a
                        href={`mailto:${club.contactEmail}`}
                        className="link link-accent break-all text-sm font-medium"
                      >
                        {club.contactEmail}
                      </a>
                    </dd>
                  </div>
                )}
                {club.contactPhone && (
                  <div>
                    <dt className="text-xs text-ink-3">Phone</dt>
                    <dd className="mt-1">
                      <a
                        href={`tel:${club.contactPhone}`}
                        className="link link-accent text-sm font-medium"
                      >
                        {club.contactPhone}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </Card>
          )}

          {hasSocials && (
            <div>
              <h2 className="eyebrow mb-3">Elsewhere</h2>
              <div className="space-y-2.5">
                {websiteUrl && <SocialLink label="Website" href={websiteUrl} />}
                {instagramUrl && <SocialLink label="Instagram" href={instagramUrl} />}
                {linkedinUrl && <SocialLink label="LinkedIn" href={linkedinUrl} />}
              </div>
            </div>
          )}
        </aside>
      </div>
    </Page>
  );
}
