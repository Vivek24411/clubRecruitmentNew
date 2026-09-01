/* eslint-disable react-refresh/only-export-components */
import { cloneElement, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink } from "react-router-dom";

export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

const reduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------------------------------------------------------------------
   Motion primitives
   ------------------------------------------------------------------------- */

/**
 * Reveals its children once they scroll into view. Above-the-fold content
 * should use the `reveal` utility class instead — no observer needed.
 */
export function Reveal(props) {
  // Destructured in the body, not the signature: the project's lint config has
  // no react plugin, so a renamed param would read as unused.
  const { as: Tag = "div", delay = 0, className, children, ...rest } = props;
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduceMotion() || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translate3d(0, 18px, 0)",
        transition: `opacity .7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .7s cubic-bezier(.16,1,.3,1) ${delay}ms`,
        willChange: shown ? "auto" : "opacity, transform",
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Eases a number up to its target. Returns the current display value. */
export function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(reduceMotion() ? target : 0);
  const previous = useRef(0);

  useEffect(() => {
    const to = Number(target) || 0;
    if (reduceMotion()) {
      setValue(to);
      previous.current = to;
      return;
    }
    const from = previous.current;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
      else previous.current = to;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

/* ---------------------------------------------------------------------------
   Page furniture
   ------------------------------------------------------------------------- */

export function Page({ width = "7xl", className, children }) {
  const max = { "3xl": "max-w-3xl", "5xl": "max-w-5xl", "7xl": "max-w-7xl" }[width];
  return (
    <div className={cx("page-shell mx-auto min-w-0 w-full px-4 py-8 sm:px-6 sm:py-10 lg:py-14", max, className)}>{children}</div>
  );
}

/**
 * The editorial page opener: eyebrow, accent rule that draws itself,
 * serif headline, and optional actions parked on the right.
 */
export function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <header className={cx("page-head reveal", className)}>
      {eyebrow && (
        <div className="flex items-center gap-3">
          <span className="eyebrow eyebrow-accent">{eyebrow}</span>
          <hr className="rule-accent animate-draw flex-none" style={{ animationDelay: "180ms" }} />
        </div>
      )}
      <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="display text-3xl sm:text-4xl lg:text-[2.75rem]">{title}</h1>
          {description && (
            <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-2">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
      <hr className="rule animate-draw mt-7" style={{ animationDelay: "260ms" }} />
    </header>
  );
}

export function SectionHeader({ title, description, action, className }) {
  return (
    <div className={cx("section-head flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="display text-xl sm:text-2xl">{title}</h2>
        {description && <p className="mt-1.5 text-sm text-ink-3">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Divider({ className }) {
  return <hr className={cx("rule", className)} />;
}

/* ---------------------------------------------------------------------------
   Surfaces
   ------------------------------------------------------------------------- */

export function Card(props) {
  const { as: Tag = "div", interactive = false, className, children, ...rest } = props;
  return (
    <Tag className={cx("card", interactive && "card-interactive", className)} {...rest}>
      {children}
    </Tag>
  );
}

/** A card that is also a link — used for every list row across the apps. */
export function CardLink({ to, className, children, ...rest }) {
  return (
    <Link to={to} className={cx("card card-interactive", className)} {...rest}>
      {children}
    </Link>
  );
}

/* ---------------------------------------------------------------------------
   Controls
   ------------------------------------------------------------------------- */

const VARIANTS = {
  primary: "btn-primary",
  accent: "btn-accent",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

export function Button({
  variant = "primary",
  size,
  to,
  href,
  loading = false,
  block = false,
  className,
  children,
  ...rest
}) {
  const classes = cx(
    "btn",
    VARIANTS[variant] || VARIANTS.primary,
    size === "sm" && "btn-sm",
    size === "lg" && "btn-lg",
    block && "btn-block",
    className,
  );

  const body = (
    <span className="btn-label">
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </span>
  );

  if (to) return <Link to={to} className={classes} {...rest}>{body}</Link>;
  if (href) return <a href={href} className={classes} {...rest}>{body}</a>;
  return (
    <button className={classes} disabled={loading || rest.disabled} {...rest}>
      {body}
    </button>
  );
}

const TONES = {
  neutral: "badge-neutral",
  accent: "badge-accent",
  ok: "badge-ok",
  warn: "badge-warn",
  bad: "badge-bad",
  info: "badge-info",
};

export function Badge({ tone = "neutral", live = false, className, children, ...rest }) {
  return (
    <span className={cx("badge", TONES[tone] || TONES.neutral, className)} {...rest}>
      {live && <span className="dot-live" aria-hidden="true" />}
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   Forms
   ------------------------------------------------------------------------- */

export function Field({ label, hint, error, required, children, className, id }) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const descriptionId = (error || hint) ? String(fieldId) + "-description" : undefined;
  const control = isValidElement(children) ? cloneElement(children, {
    id: children.props.id || fieldId,
    "aria-describedby": [children.props["aria-describedby"], descriptionId].filter(Boolean).join(" ") || undefined,
    "aria-invalid": error ? "true" : children.props["aria-invalid"],
    required: children.props.required ?? required,
  }) : children;
  return (
    <div className={cx("field-shell", className)}>
      {label && (
        <label className="label" htmlFor={fieldId}>
          {label}
          {required && <span className="ml-1 text-accent">*</span>}
        </label>
      )}
      {control}
      {error ? (
        <p id={descriptionId} className="hint text-bad" role="alert">{error}</p>
      ) : hint ? (
        <p id={descriptionId} className="hint">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...rest }) {
  return <input className={cx("input", className)} {...rest} />;
}

export function PasswordInput({ className, ...rest }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        className={cx("input pr-16", className)}
        {...rest}
        type={visible ? "text" : "password"}
      />
      <button
        type="button"
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-sm px-2.5 py-1.5 text-xs font-semibold text-ink-3 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export function Textarea({ className, ...rest }) {
  return <textarea className={cx("textarea", className)} {...rest} />;
}

export function Select({ className, children, ...rest }) {
  return (
    <select className={cx("select", className)} {...rest}>
      {children}
    </select>
  );
}

/* ---------------------------------------------------------------------------
   Loading & empty states
   ------------------------------------------------------------------------- */

export function Skeleton({ className }) {
  return <div className={cx("skeleton", className)} aria-hidden="true" />;
}

/** Placeholder list that mirrors the shape of a real card list. */
export function SkeletonList({ rows = 4, className }) {
  return (
    <div className={cx("space-y-3", className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="card skeleton-card p-5" style={{ opacity: 1 - index * 0.14 }}>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-5 w-2/3" />
          <Skeleton className="mt-3 h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, description, action, className }) {
  return (
    <div
      className={cx(
        "empty-state reveal flex flex-col items-center rounded-md border border-dashed border-line-2 bg-surface/60 px-6 py-14 text-center",
        className,
      )}
    >
      {/* A quiet drawn mark rather than a stock illustration. */}
      <svg className="empty-state-mark" width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
        <circle cx="22" cy="22" r="21" stroke="currentColor" className="text-line-2" />
        <path
          d="M13 26.5c3-4 6-6 9-6s6 2 9 6"
          stroke="currentColor"
          className="text-line-2"
          strokeLinecap="round"
        />
        <circle cx="17" cy="17.5" r="1.6" fill="currentColor" className="text-line-2" />
        <circle cx="27" cy="17.5" r="1.6" fill="currentColor" className="text-line-2" />
      </svg>
      <h3 className="display mt-4 text-lg">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-ink-3">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Spinner({ className }) {
  return <span className={cx("spinner", className)} role="status" aria-label="Loading" />;
}

/* ---------------------------------------------------------------------------
   Data display
   ------------------------------------------------------------------------- */

/** Big number that counts up, over a small caps label. */
export function Stat({ label, value, suffix, hint, tone, index, className }) {
  const numeric = typeof value === "number";
  const shown = useCountUp(numeric ? value : 0);
  return (
    <div
      className={cx("stat", className)}
      data-index={index ? String(index).padStart(2, "0") : undefined}
    >
      <p className="eyebrow">{label}</p>
      <p
        className={cx(
          "stat-number display tabular mt-2.5 text-3xl sm:text-[2rem]",
          tone === "accent" && "text-accent",
        )}
        data-numeric=""
      >
        {numeric ? shown.toLocaleString("en-IN") : value}
        {suffix && <span className="ml-1 text-lg text-ink-3">{suffix}</span>}
      </p>
      {hint && <p className="mt-1.5 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

/** Label/value pair used throughout detail pages. */
export function Meta({ label, value, className }) {
  return (
    <div className={cx("meta-item", className)}>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5 text-sm font-medium text-ink">{value ?? "—"}</dd>
    </div>
  );
}

export function MetaGrid({ children, className, cols = 2 }) {
  return (
    <dl
      className={cx(
        "meta-grid grid gap-x-6 gap-y-5",
        cols === 2 ? "grid-cols-1 sm:grid-cols-2" : cols === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </dl>
  );
}

/**
 * Initials tile. Colour is derived from the name so a club always looks the
 * same, but stays inside the muted editorial range.
 */
export function Monogram({ name = "", size = "md", className }) {
  const initials = String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "—";

  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 360;
  }

  const sizes = {
    sm: "h-9 w-9 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-lg",
  };

  return (
    <span
      aria-hidden="true"
      className={cx(
        "monogram grid flex-none place-items-center rounded-md font-semibold tracking-wide text-white",
        sizes[size],
        className,
      )}
      style={{ background: `hsl(${hash} 30% 38%)` }}
    >
      {initials}
    </span>
  );
}

/**
 * Horizontal bar used for capacity/fill ratios. Grows on mount.
 */
export function Meter({ value = 0, max = 100, tone = "accent", label, className }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(pct));
    return () => cancelAnimationFrame(frame);
  }, [pct]);

  const colors = { accent: "bg-accent", ok: "bg-ok", warn: "bg-warn", bad: "bg-bad" };

  return (
    <div className={cx("meter", className)}>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between text-xs text-ink-3">
          <span>{label}</span>
          <span className="tabular font-semibold text-ink-2">
            {value}/{max}
          </span>
        </div>
      )}
      <div
        className="meter-track h-1.5 overflow-hidden rounded-full bg-paper-3"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cx("meter-fill h-full rounded-full", colors[tone] || colors.accent)}
          style={{ width: `${width}%`, transition: "width .9s cubic-bezier(.16,1,.3,1)" }}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Navigation
   ------------------------------------------------------------------------- */

/**
 * Primary nav whose active pill slides between items rather than cutting.
 * The pill is measured from the DOM so it tracks font loading and resizes.
 */
export function SlidingNav({ links, ariaLabel, className }) {
  const navRef = useRef(null);
  const [box, setBox] = useState({ opacity: 0, width: 0, x: 0 });

  const measure = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector('[aria-current="page"]');
    const next = active
      ? { opacity: 1, width: active.offsetWidth, x: active.offsetLeft }
      : { opacity: 0, width: 0, x: 0 };
    // Returning the previous object when nothing moved keeps this effect,
    // which runs on every render, from looping.
    setBox((prev) =>
      prev.opacity === next.opacity && prev.width === next.width && prev.x === next.x
        ? prev
        : next,
    );
  }, []);

  useLayoutEffect(measure);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    window.addEventListener("resize", measure);
    // Fraunces/Inter arriving late shifts the tabs — re-measure when they land.
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  return (
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      className={cx("relative flex items-center gap-0.5 overflow-x-auto", className)}
    >
      <span
        className="nav-indicator"
        aria-hidden="true"
        style={{
          opacity: box.opacity,
          width: `${box.width}px`,
          transform: `translateX(${box.x}px)`,
        }}
      />
      {links.map(([to, label]) => (
        <NavLink key={to} to={to} end={to === "/"} className="nav-link">
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

/* ---------------------------------------------------------------------------
   Overlay
   ------------------------------------------------------------------------- */

/**
 * Centred dialog over a blurred scrim. Closes on Escape and on scrim click,
 * and locks body scroll while open.
 */
export function Modal({ open, onClose, title, description, children, labelledBy = "modal-title" }) {
  const panelRef = useRef(null);
  const previousFocusRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement;
    const main = document.querySelector(".app-main");
    const previousAriaHidden = main?.getAttribute("aria-hidden");
    if (main) {
      main.setAttribute("inert", "");
      main.setAttribute("aria-hidden", "true");
    }
    const onKeyDown = (nativeEvent) => {
      if (nativeEvent.key === "Escape") onClose?.();
      if (nativeEvent.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) {
        nativeEvent.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1);
      if (nativeEvent.shiftKey && document.activeElement === first) {
        nativeEvent.preventDefault();
        last.focus();
      } else if (!nativeEvent.shiftKey && document.activeElement === last) {
        nativeEvent.preventDefault();
        first.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    const focusFrame = window.requestAnimationFrame(() => {
      const initial = panelRef.current?.querySelector('[autofocus], button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
      (initial || panelRef.current)?.focus();
    });
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.cancelAnimationFrame(focusFrame);
      if (main) {
        main.removeAttribute("inert");
        if (previousAriaHidden == null) main.removeAttribute("aria-hidden");
        else main.setAttribute("aria-hidden", previousAriaHidden);
      }
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-root fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div
        className="modal-scrim absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div ref={panelRef} tabIndex={-1} className="modal-panel relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-line bg-surface p-6 shadow-pop">
        {onClose && (
          <button type="button" className="modal-close" aria-label="Close dialog" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </button>
        )}
        <h2 id={labelledBy} className="display text-xl">
          {title}
        </h2>
        {description && <p className="mt-2 text-sm leading-relaxed text-ink-3">{description}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Wraps a table so it scrolls on its own instead of the page. */
export function TableWrap({ children, className }) {
  return (
    <div className={cx("table-wrap card overflow-hidden", className)}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
