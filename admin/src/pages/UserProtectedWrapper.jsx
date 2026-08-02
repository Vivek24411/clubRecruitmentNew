import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AdminContextData } from "../context/AdminContext";
import AdminLayout from "../components/AdminLayout";

export default function UserProtectedWrapper({ children }) {
  const { loggedInAdmin, authLoading } = useContext(AdminContextData);
  if (authLoading) return <div className="grid min-h-screen place-items-center" role="status">Checking your session…</div>;
  if (!loggedInAdmin) return <Navigate to="/login" replace />;
  return <AdminLayout>{children}</AdminLayout>;
}
