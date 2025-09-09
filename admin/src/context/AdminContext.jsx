import axios from 'axios';
import React from 'react'
import { useEffect } from 'react';

export const AdminContextData = React.createContext();

const AdminContext = ({children}) => {

    const [loggedInAdmin, setLoggedInAdmin] = React.useState(!!localStorage.getItem("adminToken"));
    const [adminProfile, setAdminProfile] = React.useState(null);



    async function fetchAdminProfile() {
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/admin/getProfile`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("adminToken")}`
                }
            });
            console.log(response.data);
            if(response.data.success){
                setAdminProfile(response.data.profile);
            }else{
                console.log(response.data.msg);
                
            }
        } catch (error) {
            console.error("Error fetching admin profile:", error);
        }
    }

    useEffect(() => {
      if(loggedInAdmin){
        fetchAdminProfile();
      }
    }, [loggedInAdmin]);

    return (
        <AdminContextData.Provider value={{ loggedInAdmin, adminProfile , setLoggedInAdmin }}>
            {children}
        </AdminContextData.Provider>
    )
}

export default AdminContext