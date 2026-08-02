import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { ClubContextData } from "../context/ClubContext";
import ClubLayout from "../components/ClubLayout";

export default function UserProtectedWrapper({ children }) {
  const { loggedInClub, authLoading } = useContext(ClubContextData);
  if (authLoading) return <div className="grid min-h-screen place-items-center" role="status">Checking your session…</div>;
  if (!loggedInClub) return <Navigate to="/login" replace />;
  return <ClubLayout>{children}</ClubLayout>;
}
