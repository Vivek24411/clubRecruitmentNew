import { useContext, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AdminContextData } from "../context/AdminContext";
import { SlidingNav } from "./ui";

const links = [
  ["/", "Overview"],
  ["/clubs", "Clubs"],
  ["/students", "Students"],
  ["/events", "Events"],
  ["/sessions", "Sessions"],
  ["/settings", "Recruitment"],
  ["/audit-logs", "Audit log"],
];

export default function AdminLayout({ children }) {
  const { signOut } = useContext(AdminContextData);
  const [lifted, setLifted] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div className="site-shell text-ink">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className={`app-header ${lifted ? "is-lifted" : ""}`}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:px-6">
          <NavLink to="/" className="group mr-auto flex items-center gap-3">
            <span className="brand-mark">D</span>
            <span>
              <span className="brand-name block text-sm font-semibold leading-tight">Discovr</span>
              <span className="eyebrow brand-meta mt-0.5 block">Control room</span>
            </span>
          </NavLink>

          <SlidingNav
            links={links}
            ariaLabel="Admin navigation"
            className="order-3 w-full lg:order-2 lg:w-auto"
          />

          <button onClick={logout} className="btn btn-ghost btn-sm order-2 lg:order-3">
            Sign out
          </button>
        </div>
        <span className="reading-progress" aria-hidden="true" />
      </header>

      <main id="main-content" className="app-main">{children}</main>

      <footer className="app-footer mt-24 border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Discovr · Administration console</p>
        </div>
      </footer>
    </div>
  );
}
