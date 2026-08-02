/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const RouterContext = createContext(null);
const ParamsContext = createContext({});

function safePath(value) {
  const path = String(value || "/");
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return "/";
  return path;
}

export function BrowserRouter({ children }) {
  const [location, setLocation] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPopState = () => setLocation(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((destination, options = {}) => {
    const path = safePath(destination);
    window.history[options.replace ? "replaceState" : "pushState"]({}, "", path);
    setLocation(window.location.pathname);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const value = useMemo(() => ({ location, navigate }), [location, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

function matchPath(pattern, pathname) {
  const expected = pattern === "/" ? [] : pattern.replace(/^\/+|\/+$/g, "").split("/");
  const actual = pathname === "/" ? [] : pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (expected.length !== actual.length) return null;
  const params = {};
  for (let index = 0; index < expected.length; index += 1) {
    if (expected[index].startsWith(":")) {
      try { params[expected[index].slice(1)] = decodeURIComponent(actual[index]); }
      catch { return null; }
    } else if (expected[index] !== actual[index]) return null;
  }
  return params;
}

export function Routes({ children }) {
  const { location } = useContext(RouterContext);
  for (const child of React.Children.toArray(children)) {
    const params = matchPath(child.props.path, location);
    if (params) return <ParamsContext.Provider value={params}>{child.props.element}</ParamsContext.Provider>;
  }
  return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-bold">Page not found</h1><Link to="/" className="mt-4 inline-block text-blue-700">Return home</Link></main>;
}

export function Route() { return null; }
export function useParams() { return useContext(ParamsContext); }
export function useNavigate() { return useContext(RouterContext).navigate; }

export function Navigate({ to, replace = false }) {
  const navigate = useNavigate();
  useEffect(() => { navigate(to, { replace }); }, [navigate, replace, to]);
  return null;
}

export function Link({ to, onClick, children, ...props }) {
  const navigate = useNavigate();
  const href = safePath(to);
  const handleClick = (event) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(href);
  };
  return <a {...props} href={href} onClick={handleClick}>{children}</a>;
}

export function NavLink({ to, end = false, className, children, ...props }) {
  const { location } = useContext(RouterContext);
  const href = safePath(to);
  const isActive = end ? location === href : location === href || (href !== "/" && location.startsWith(href + "/"));
  const resolvedClassName = typeof className === "function" ? className({ isActive }) : className;
  return <Link {...props} to={href} className={resolvedClassName} aria-current={isActive ? "page" : undefined}>{children}</Link>;
}
