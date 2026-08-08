import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AdminContextData } from "../context/AdminContext";
import AdminLayout from "../components/AdminLayout";

/** Branded hold screen while the session cookie is verified. */
function SessionCheck() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-6" role="status">
      <div className="reveal text-center">
        <div className="flex items-baseline justify-center gap-2">
          <span className="display text-2xl">Recruit</span>
          <span className="eyebrow eyebrow-accent">Admin</span>
        </div>
        <hr className="rule-accent animate-draw mx-auto mt-5" style={{ animationDelay: "120ms" }} />
        <p className="mt-5 text-sm text-ink-3">Checking your session…</p>
      </div>
    </div>
  );
}

export default function UserProtectedWrapper({ children }) {
  const { loggedInAdmin, authLoading } = useContext(AdminContextData);
  if (authLoading) return <SessionCheck />;
  if (!loggedInAdmin) return <Navigate to="/login" replace />;
  return <AdminLayout>{children}</AdminLayout>;
}
