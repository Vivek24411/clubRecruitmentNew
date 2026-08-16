import { useContext, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { StudentContextData } from "../context/StudentContext";
import { Monogram, SlidingNav } from "./ui";

const publicLinks = [
  ["/", "Discover"],
  ["/events", "Events"],
  ["/sessions", "Sessions"],
  ["/clubs", "Clubs"],
];

export default function StudentLayout({ children }) {
  const { loggedInStudent, profile, signOut } = useContext(StudentContextData);
  const [unread, setUnread] = useState(0);
  const [lifted, setLifted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loggedInStudent) {
      setUnread(0);
      return undefined;
    }
    const loadUnread = () => {
      if (document.hidden) return Promise.resolve();
      return (
      axios
        .get(`${import.meta.env.VITE_BASE_URI}/student/notifications/unread-count`)
        .then(({ data }) => data.success && setUnread(data.unreadCount))
        .catch(() => {})
      );
    };
    loadUnread();
    const timer = window.setInterval(loadUnread, 120000);
    const onVisibility = () => { if (!document.hidden) loadUnread(); };
    window.addEventListener("notifications-updated", loadUnread);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("notifications-updated", loadUnread);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loggedInStudent]);

  useEffect(() => {
    const onScroll = () => {
      setLifted(window.scrollY > 8);
      const available = document.documentElement.scrollHeight - window.innerHeight;
      document.documentElement.style.setProperty(
        "--scroll-progress",
        String(available > 0 ? Math.min(window.scrollY / available, 1) : 0),
      );
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.documentElement.style.removeProperty("--scroll-progress");
    };
  }, []);

  const logout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const links = loggedInStudent
    ? [...publicLinks, ["/applications", "Applications"]]
    : publicLinks;

  return (
    <div className="site-shell text-ink">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className={`app-header ${lifted ? "is-lifted" : ""}`}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:px-6">
          <NavLink
            to="/"
            className="group mr-auto"
            aria-label="Discovr home"
          >
            <img
              src="/discovrlogo.png"
              alt="Discovr"
              className="block h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </NavLink>

          <SlidingNav
            links={links}
            ariaLabel="Student navigation"
            className="order-3 w-full sm:order-2 sm:w-auto"
          />

          <div className="order-2 flex items-center gap-1 sm:order-3">
            {loggedInStudent ? (
              <>
                <NavLink
                  to="/notifications"
                  aria-label={`Notifications, ${unread} unread`}
                  className="nav-link !px-2.5"
                >
                  Alerts
                  {unread > 0 && (
                    <span className="animate-scale-in ml-1.5 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-accent px-1 text-[0.625rem] font-bold text-white tabular">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </NavLink>

                <NavLink
                  to="/profile"
                  aria-label="Open your profile"
                  className="profile-link group flex items-center gap-2 rounded-sm py-1 pl-1 pr-2.5 transition-colors duration-300"
                >
                  {profile?.profilePicture ? <img src={profile.profilePicture} alt={`${profile?.name || "Student"} profile`} className="h-9 w-9 rounded-full border border-white/25 bg-surface object-cover shadow-sm" /> : <Monogram name={profile?.name || "Student"} size="sm" />}
                  <span className="hidden text-sm font-medium sm:inline">
                    {profile?.name?.split(" ")[0] || "Profile"}
                  </span>
                </NavLink>

                <button onClick={logout} className="btn btn-ghost btn-sm">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="btn btn-ghost btn-sm">
                  Sign in
                </NavLink>
                <NavLink to="/register" className="btn btn-accent btn-sm hidden sm:inline-flex">
                  Create account
                </NavLink>
              </>
            )}
          </div>
        </div>
        <span className="reading-progress" aria-hidden="true" />
      </header>

      <main id="main-content" className="app-main">{children}</main>

      <footer className="app-footer mt-24 border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Discovr · Indian Institute of Technology Roorkee</p>
        </div>
      </footer>
    </div>
  );
}
