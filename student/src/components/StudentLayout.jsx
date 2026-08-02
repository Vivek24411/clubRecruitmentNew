import { useContext, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { StudentContextData } from "../context/StudentContext";

const links = [
  ["/", "Discover"],
  ["/events", "Events"],
  ["/sessions", "Sessions"],
  ["/clubs", "Clubs"],
  ["/applications", "My applications"],
];

export default function StudentLayout({ children }) {
  const { profile, signOut } = useContext(StudentContextData);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUnread = () => axios.get(`${import.meta.env.VITE_BASE_URI}/student/notifications`)
      .then(({ data }) => data.success && setUnread(data.unreadCount))
      .catch(() => {});
    loadUnread();
    const timer = window.setInterval(loadUnread, 60000);
    window.addEventListener("notifications-updated", loadUnread);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("notifications-updated", loadUnread);
    };
  }, []);

  const logout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <NavLink to="/" className="mr-auto text-lg font-extrabold tracking-tight text-[#1a4b8e]">Recruit IITR</NavLink>
          <nav aria-label="Student navigation" className="order-3 flex w-full gap-1 overflow-x-auto sm:order-2 sm:w-auto">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "bg-blue-50 text-[#1a4b8e]" : "text-slate-600 hover:bg-slate-100"}`}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="order-2 flex items-center gap-2 sm:order-3">
            <NavLink to="/notifications" aria-label={`${unread} unread notifications`} className="relative rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              Alerts{unread > 0 && <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-xs text-white">{unread}</span>}
            </NavLink>
            <NavLink to="/profile" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">{profile?.name?.split(" ")[0] || "Profile"}</NavLink>
            <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100">Sign out</button>
          </div>
        </div>
      </header>
      <main id="main-content">{children}</main>
    </div>
  );
}
