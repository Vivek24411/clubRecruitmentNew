import { useContext, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ClubContextData } from "../context/ClubContext";
import { SlidingNav } from "./ui";

const links = [
  ["/", "Dashboard"],
  ["/events", "Events"],
  ["/sessions", "Sessions"],
  ["/profile", "Club profile"],
];

export default function ClubLayout({ children }) {
  const { signOut } = useContext(ClubContextData);
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
          <NavLink
            to="/"
            className="group mr-auto flex items-center gap-2.5"
            aria-label="Discovr club home"
          >
            <img
              src="/discovr-o.png"
              alt=""
              className="block h-8 w-8 flex-none object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <span className="brand-name text-base font-semibold leading-none">Discovr</span>
          </NavLink>

          <SlidingNav
            links={links}
            ariaLabel="Club navigation"
            className="order-3 w-full sm:order-2 sm:w-auto"
          />

          <div className="order-2 flex items-center gap-2 sm:order-3">
            <NavLink to="/addEvent" className="btn btn-accent btn-sm">
              New event
            </NavLink>
            <button onClick={logout} className="btn btn-ghost btn-sm">
              Sign out
            </button>
          </div>
        </div>
        <span className="reading-progress" aria-hidden="true" />
      </header>

      <main id="main-content" className="app-main">{children}</main>

      <footer className="app-footer mt-24 border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Discovr · Club workspace</p>
        </div>
      </footer>
    </div>
  );
}
