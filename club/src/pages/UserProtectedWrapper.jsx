import React from "react";
import { useEffect } from "react";
import {useNavigate} from "react-router-dom";

const UserProtectedWrapper = ({ children }) => {
  const token = localStorage.getItem("clubToken");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token]);

  if (!token) {
    return null;
  }

  return <>{children}</>;
};

export default UserProtectedWrapper;
