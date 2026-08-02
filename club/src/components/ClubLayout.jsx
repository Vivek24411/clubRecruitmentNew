import { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ClubContextData } from "../context/ClubContext";

const links = [["/", "Dashboard"], ["/events", "Events"], ["/sessions", "Sessions"], ["/profile", "Club profile"]];

export default function ClubLayout({ children }) {
  const { clubProfile, signOut } = useContext(ClubContextData);
  const navigate = useNavigate();
  const logout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <NavLink to="/" className="mr-auto text-lg font-extrabold text-[#1a4b8e]">{clubProfile?.name || "Club portal"}</NavLink>
          <nav aria-label="Club navigation" className="order-3 flex w-full gap-1 overflow-x-auto sm:order-2 sm:w-auto">
            {links.map(([to, label]) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "bg-blue-50 text-[#1a4b8e]" : "text-slate-600 hover:bg-slate-100"}`}>{label}</NavLink>)}
          </nav>
          <button onClick={logout} className="order-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 sm:order-3">Sign out</button>
        </div>
      </header>
      <main id="main-content">{children}</main>
    </div>
  );
}
