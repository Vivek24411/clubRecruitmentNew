import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { StudentContextData } from "../context/StudentContext";
import StudentLayout from "../components/StudentLayout";

/** Branded hold screen while the session cookie is verified. */
function SessionCheck() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-6" role="status">
      <div className="reveal text-center">
        <div className="inline-flex rounded-sm bg-ink px-5 py-3">
          <img
            src="/discovrlogo.png"
            alt="Discovr"
            className="block h-auto w-48 max-w-full"
          />
        </div>
        <hr className="rule-accent animate-draw mx-auto mt-5" style={{ animationDelay: "120ms" }} />
        <p className="mt-5 text-sm text-ink-3">Checking your session…</p>
      </div>
    </div>
  );
}

export default function ProtectedWrapper({ children }) {
  const { loggedInStudent, authLoading } = useContext(StudentContextData);
  if (authLoading) return <SessionCheck />;
  if (!loggedInStudent) {
    const intended = `${window.location.pathname}${window.location.search}`;
    if (intended !== "/login" && intended.startsWith("/") && !intended.startsWith("//")) {
      sessionStorage.setItem("studentReturnTo", intended);
    }
    return <Navigate to="/login" replace />;
  }
  return <StudentLayout>{children}</StudentLayout>;
}
