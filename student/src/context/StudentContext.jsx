/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useEffect } from "react";
import axios from "axios";

export const StudentContextData = React.createContext(null);

const StudentContext = ({ children }) => {
  const [loggedInStudent, setLoggedInStudent] = React.useState(false);
  const [profile, setProfile] = React.useState(null);
  const [authLoading, setAuthLoading] = React.useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/student/getProfile`);
      if (!response.data.success) throw new Error(response.data.msg);
      setProfile(response.data.student);
      setLoggedInStudent(true);
      return true;
    } catch {
      setProfile(null);
      setLoggedInStudent(false);
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await axios.post(`${import.meta.env.VITE_BASE_URI}/student/logout`);
    } finally {
      localStorage.removeItem("token");
      setProfile(null);
      setLoggedInStudent(false);
    }
  }, []);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          setProfile(null);
          setLoggedInStudent(false);
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  useEffect(() => {
    localStorage.removeItem("token");
    refreshProfile();
  }, [refreshProfile]);

  return (
    <StudentContextData.Provider value={{
      profile,
      setProfile,
      loggedInStudent,
      setLoggedInStudent,
      authLoading,
      refreshProfile,
      signOut,
    }}>
      {children}
    </StudentContextData.Provider>
  );
};

export default StudentContext;
