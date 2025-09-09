import axios from "axios";
import React from "react";
import { useEffect } from "react";

export const ClubContextData = React.createContext();

const ClubContext = ({ children }) => {

  const [loggedInClub, setLoggedInClub] = React.useState(
    !!localStorage.getItem("clubToken")
  );

  const [clubProfile, setClubProfile] = React.useState(null);

  async function fetchClubProfile() {
    const response = await axios.get(
      `${import.meta.env.VITE_BASE_URI}/club/getProfile`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("clubToken")}`,
        },
      }
    );

    if (response.data.success) {
      setClubProfile(response.data.club);
    } else {
      setClubProfile(null);
    }
  }

  useEffect(() => {
    if (loggedInClub) {
      fetchClubProfile();
    }
  }, [loggedInClub]);

  return (
    <ClubContextData.Provider value={{ loggedInClub, clubProfile , setLoggedInClub, setClubProfile}}>
      {children}
    </ClubContextData.Provider>
  );
};

export default ClubContext;
