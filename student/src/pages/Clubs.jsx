import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import {
  Button,
  EmptyState,
  Input,
  Monogram,
  Page,
  PageHeader,
  Skeleton,
} from "../components/ui";

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Club logo with a monogram fallback that survives a broken image URL. */
function ClubMark({ club }) {
  const [failed, setFailed] = useState(false);
  if (!club.clubLogo || failed) return <Monogram name={club.name} size="lg" />;
  return (
    <img
      src={club.clubLogo}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-16 w-16 flex-none rounded-md border border-line bg-surface object-contain p-1"
    />
  );
}

export default function Clubs() {
  const [clubs, setClubs] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    async function fetchClubs() {
      setIsLoading(true);
      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/student/getAllClubs`);
        if (response.data.success) setClubs(response.data.clubs);
        else toast.error(response.data.msg);
      } catch {
        toast.error("Failed to load clubs");
      } finally {
        setIsLoading(false);
      }
    }
    fetchClubs();
  }, []);

  const filteredClubs = useMemo(() => {
    if (!clubs) return [];
    const query = searchTerm.trim().toLowerCase();
    return clubs.filter(
      (club) =>
        (category === "all" || club.category === category) &&
        (!query || club.name?.toLowerCase().includes(query) ||
        club.shortDescription?.toLowerCase().includes(query)),
    );
  }, [category, clubs, searchTerm]);

  return (
    <Page>
      <PageHeader
        eyebrow="Directory"
        title="Clubs and societies"
        description="Every student group on campus, with their recruitment events and information sessions."
      />

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-md flex-1">
        <label className="sr-only" htmlFor="search">
          Search clubs
        </label>
        <SearchIcon />
        <Input
          id="search"
          type="search"
          className="pl-9"
          placeholder="Search clubs…"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>
        <div className="flex rounded-sm border border-line bg-surface p-1" role="group" aria-label="Club category">{[["all", "All"], ["technical", "Technical"], ["cultural", "Cultural"]].map(([value, label]) => <button key={value} type="button" className={`px-3 py-1.5 text-sm font-semibold ${category === value ? "bg-ink text-white" : "text-ink-3"}`} onClick={() => setCategory(value)}>{label}</button>)}</div>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="card p-6">
                <Skeleton className="h-16 w-16 rounded-md" />
                <Skeleton className="mt-4 h-5 w-2/3" />
                <Skeleton className="mt-3 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-4/5" />
              </div>
            ))}
          </div>
        ) : filteredClubs.length === 0 ? (
          <EmptyState
            title={searchTerm ? "No matching clubs" : "No clubs listed"}
            description={
              searchTerm
                ? "Try a different name or keyword."
                : "The club directory hasn't been published yet."
            }
            action={
              searchTerm && (
                <Button variant="secondary" onClick={() => setSearchTerm("")}>
                  Clear search
                </Button>
              )
            }
          />
        ) : (
          <>
            <p className="mb-5 text-sm text-ink-3" role="status">
              <span className="tabular font-semibold text-ink">{filteredClubs.length}</span>{" "}
              {filteredClubs.length === 1 ? "club" : "clubs"}
            </p>
            <div className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredClubs.map((club) => (
                <Link
                  key={club._id}
                  to={`/club/${club._id}`}
                  className="card card-interactive group flex flex-col p-6"
                >
                  <ClubMark club={club} />
                  <h2 className="display mt-5 text-lg leading-snug">{club.name}</h2>
                  {club.shortDescription && (
                    <p className="mt-2.5 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-3">
                      {club.shortDescription}
                    </p>
                  )}
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                    View club
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </Page>
  );
}
