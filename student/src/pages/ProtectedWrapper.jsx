import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { StudentContextData } from "../context/StudentContext";
import StudentLayout from "../components/StudentLayout";

export default function ProtectedWrapper({ children }) {
  const { loggedInStudent, authLoading } = useContext(StudentContextData);
  if (authLoading) return <div className="grid min-h-screen place-items-center" role="status">Checking your session…</div>;
  if (!loggedInStudent) return <Navigate to="/login" replace />;
  return <StudentLayout>{children}</StudentLayout>;
}
