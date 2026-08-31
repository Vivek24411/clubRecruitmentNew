/* eslint-disable react-refresh/only-export-components */
import axios from "axios";
import React, { useCallback, useEffect } from "react";

export const ClubContextData = React.createContext(null);

const ClubContext = ({ children }) => {
  const [loggedInClub, setLoggedInClub] = React.useState(false);
  const [clubProfile, setClubProfile] = React.useState(null);
  const [authLoading, setAuthLoading] = React.useState(true);

  const refreshClubProfile = useCallback(async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/club/getProfile`);
      if (!response.data.success) throw new Error(response.data.msg);
      setClubProfile(response.data.club);
      setLoggedInClub(true);
      return true;
    } catch {
      setClubProfile(null);
      setLoggedInClub(false);
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await axios.post(`${import.meta.env.VITE_BASE_URI}/club/logout`);
    } finally {
      setClubProfile(null);
      setLoggedInClub(false);
    }
  }, []);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          setClubProfile(null);
          setLoggedInClub(false);
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  useEffect(() => {
    refreshClubProfile();
  }, [refreshClubProfile]);

  return (
    <ClubContextData.Provider value={{ loggedInClub, clubProfile, setLoggedInClub, setClubProfile, authLoading, refreshClubProfile, signOut }}>
      {children}
    </ClubContextData.Provider>
  );
};

export default ClubContext;
