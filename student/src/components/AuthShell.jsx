import { Link } from "react-router-dom";

/**
 * Split auth layout: an ink panel carrying the masthead and a standing
 * statement, beside the form on paper. The panel collapses to a slim
 * header strip on small screens.
 */
export default function AuthShell({ eyebrow, title, description, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,42%)_1fr]">
      {/* ---------------------------------------------------------------- */}
      {/* Standing panel                                                    */}
      {/* ---------------------------------------------------------------- */}
      <aside className="auth-panel relative flex flex-col justify-between overflow-hidden bg-ink px-6 py-8 text-white sm:px-10 lg:py-12">
        {/* Two very soft radial washes so the panel is not a flat block. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(60rem 40rem at 15% 0%, rgb(255 255 255 / 0.08), transparent 60%), radial-gradient(40rem 40rem at 90% 100%, rgb(255 255 255 / 0.05), transparent 60%)",
          }}
        />

        <div className="relative">
          <Link to="/login" className="flex items-baseline gap-2">
            <span className="display text-xl text-white">Discovr</span>
            <span className="eyebrow text-white/55">IITR</span>
          </Link>
          <p className="hero-kicker mt-6">Student portal</p>
        </div>

        <div className="relative mt-10 hidden lg:block">
          <hr
            className="animate-draw h-px w-14 border-0 bg-white/30"
            style={{ animationDelay: "200ms" }}
          />
          <p
            className="display reveal mt-7 max-w-md text-3xl leading-tight text-white"
            style={{ "--d": "120ms" }}
          >
            Every club on campus. One application trail.
          </p>
          <p className="reveal mt-5 max-w-sm text-sm leading-relaxed text-white/60" style={{ "--d": "220ms" }}>
            Apply, invite your team, follow each selection round, and hear back — without chasing a
            single spreadsheet.
          </p>
        </div>

        <p className="relative mt-8 hidden text-xs text-white/40 lg:block">
          Indian Institute of Technology Roorkee
        </p>
      </aside>

      {/* ---------------------------------------------------------------- */}
      {/* Form                                                              */}
      {/* ---------------------------------------------------------------- */}
      <main className="auth-form flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="auth-form-card w-full max-w-md">
          <header className="reveal">
            {eyebrow && <p className="eyebrow eyebrow-accent">{eyebrow}</p>}
            <h1 className="display mt-2.5 text-3xl sm:text-4xl">{title}</h1>
            {description && <p className="mt-3 text-sm leading-relaxed text-ink-2">{description}</p>}
          </header>

          <div className="reveal mt-8" style={{ "--d": "90ms" }}>
            {children}
          </div>

          {footer && (
            <div className="reveal mt-8 border-t border-line pt-6 text-sm text-ink-2" style={{ "--d": "160ms" }}>
              {footer}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
