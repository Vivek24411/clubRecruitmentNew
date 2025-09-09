import React from 'react'
import { useEffect } from 'react';
import axios from 'axios';

export const StudentContextData = React.createContext();

const StudentContext = ({children}) => {


    const [loggedInStudent, setLoggedInStudent] = React.useState(!!localStorage.getItem("token"));
    const [profile, setProfile] = React.useState(null); 


    async function fetchProfile(){
        const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/student/getProfile`,{
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`
            }
        });

        console.log(response);
        

        if(response.data.success){
            setProfile(response.data.student);
        }else{
            console.error("Failed to fetch profile:", response.data.msg);
        }
    }
    
    useEffect(()=>{
      if(loggedInStudent){
        fetchProfile()
      }
    },[loggedInStudent])

    
  return (
    <StudentContextData.Provider value={{profile, setProfile, loggedInStudent, setLoggedInStudent}}>
        {children}
    </StudentContextData.Provider>
  )
}

export default StudentContext