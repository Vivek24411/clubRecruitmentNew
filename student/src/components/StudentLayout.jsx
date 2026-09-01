import { useContext, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { StudentContextData } from "../context/StudentContext";
import { Button, Modal, Monogram, SlidingNav } from "./ui";
import { toast } from "react-toastify";
import {
  enablePushNotifications,
  getPushNotificationPreference,
  getPushNotificationState,
  keepPushNotificationsDisabled,
  syncPushRegistration,
} from "../utils/pushNotifications";

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
  const [pushPrompt, setPushPrompt] = useState({ open: false, status: "disabled" });
  const [pushPromptWorking, setPushPromptWorking] = useState(false);
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
    if (!loggedInStudent) return undefined;
    void syncPushRegistration().catch(() => {});
    const onPush = (event) => {
      const message = event.detail?.data || event.detail?.notification || {};
      const link = String(message.link || "/notifications");
      toast.info(
        <div className="min-w-0">
          <p className="font-semibold text-ink">{message.title || "Discovr update"}</p>
          {message.body && <p className="mt-1 text-sm leading-relaxed text-ink-3">{message.body}</p>}
          <p className="mt-2 text-xs font-semibold text-accent">View details →</p>
        </div>,
        { autoClose: 9000, onClick: () => navigate(link.startsWith("/") && !link.startsWith("//") ? link : "/notifications") },
      );
      window.dispatchEvent(new Event("notifications-updated"));
    };
    window.addEventListener("discovr-push-notification", onPush);
    return () => window.removeEventListener("discovr-push-notification", onPush);
  }, [loggedInStudent, navigate]);

  useEffect(() => {
    if (!loggedInStudent) {
      setPushPrompt({ open: false, status: "disabled" });
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const state = await getPushNotificationState();
        const permissionUndecided = typeof Notification !== "undefined"
          && Notification.permission === "default";
        if (cancelled
          || state.status !== "disabled"
          || !permissionUndecided
          || getPushNotificationPreference() !== "undecided") return;
        setPushPrompt({ open: true, status: state.status });
      } catch {
        // Profile remains the fallback if this browser cannot report push state.
      }
    }, 900);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
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

  const closePushPrompt = () => {
    setPushPrompt((current) => ({ ...current, open: false }));
  };

  const keepPushDisabled = () => {
    keepPushNotificationsDisabled();
    closePushPrompt();
  };

  const enablePushFromPrompt = async () => {
    setPushPromptWorking(true);
    try {
      const state = await enablePushNotifications();
      if (state.status !== "enabled") throw new Error("Browser notifications could not be enabled");
      closePushPrompt();
      toast.success("Browser notifications enabled");
    } catch (error) {
      const blocked = typeof Notification !== "undefined" && Notification.permission === "denied";
      setPushPrompt({ open: true, status: blocked ? "blocked" : "error" });
      toast.error(error.message || "Could not enable browser notifications", { autoClose: 10000 });
    } finally {
      setPushPromptWorking(false);
    }
  };

  const openPushSettings = () => {
    closePushPrompt();
    navigate("/profile");
  };

  const links = loggedInStudent
    ? [...publicLinks, ["/calendar", "Calendar"], ["/applications", "Applications"]]
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
            className="brand-link group mr-auto"
            aria-label="Discovr home"
          >
            <img
              src="/discovrlogo.png"
              alt="Discovr"
              className="brand-wordmark block h-8 w-auto object-contain"
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

      <Modal
        open={pushPrompt.open}
        onClose={keepPushDisabled}
        title={pushPrompt.status === "blocked" ? "Notifications are blocked" : pushPrompt.status === "error" ? "Notifications need attention" : "Never miss a Discovr update"}
        description={pushPrompt.status === "blocked"
          ? "Allow notifications for this site in your browser settings, then manage this device from your Discovr Profile."
          : pushPrompt.status === "error"
            ? "We could not finish notification setup. You can try again or review the browser-notification status in Profile."
            : "Allow browser notifications for new events, sessions, application updates, deadlines, and interviews. You can turn them off anytime from Profile."}
        labelledBy="push-permission-title"
      >
        <div className="mb-5 flex items-start gap-3 rounded-md border border-accent/20 bg-accent-tint p-4">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-accent text-white shadow-sm" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 21h4" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Timely, useful alerts</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-3">Only Discovr updates are sent. Your browser controls permission for this device.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {pushPrompt.status === "blocked" ? (
            <Button type="button" variant="accent" onClick={openPushSettings}>View Profile settings</Button>
          ) : (
            <Button type="button" variant="accent" loading={pushPromptWorking} onClick={enablePushFromPrompt}>
              {pushPrompt.status === "error" ? "Try again" : "Allow notifications"}
            </Button>
          )}
          {pushPrompt.status === "error" && <Button type="button" variant="secondary" onClick={openPushSettings}>View Profile</Button>}
          <Button type="button" variant="ghost" onClick={keepPushDisabled}>Keep disabled</Button>
        </div>
      </Modal>

      <footer className="app-footer mt-24 border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Discovr · Indian Institute of Technology Roorkee</p>
        </div>
      </footer>
    </div>
  );
}
