/* eslint-disable react-refresh/only-export-components */
import axios from "axios";
import React, { useCallback, useEffect } from "react";

export const AdminContextData = React.createContext(null);

const AdminContext = ({ children }) => {
  const [loggedInAdmin, setLoggedInAdmin] = React.useState(false);
  const [adminProfile, setAdminProfile] = React.useState(null);
  const [authLoading, setAuthLoading] = React.useState(true);

  const refreshAdminProfile = useCallback(async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/admin/getProfile`);
      if (!response.data.success) throw new Error(response.data.msg);
      setAdminProfile(response.data.profile);
      setLoggedInAdmin(true);
      return true;
    } catch {
      setAdminProfile(null);
      setLoggedInAdmin(false);
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await axios.post(`${import.meta.env.VITE_BASE_URI}/admin/logout`);
    } finally {
      localStorage.removeItem("adminToken");
      setAdminProfile(null);
      setLoggedInAdmin(false);
    }
  }, []);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          setAdminProfile(null);
          setLoggedInAdmin(false);
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  useEffect(() => {
    localStorage.removeItem("adminToken");
    refreshAdminProfile();
  }, [refreshAdminProfile]);

  return (
    <AdminContextData.Provider value={{ loggedInAdmin, adminProfile, setLoggedInAdmin, authLoading, refreshAdminProfile, signOut }}>
      {children}
    </AdminContextData.Provider>
  );
};

export default AdminContext;
