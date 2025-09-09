import React from 'react'
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const UserProtectedWrapper = ({children}) => {

    const adminToken = localStorage.getItem("adminToken");
    const navigate = useNavigate();

    useEffect(() => {
    if(!adminToken){
        navigate("/login");
    }
}, [adminToken])

    if(!adminToken){
    return null;
    }

  return (
    <>
      {children}
    </>
  )
}

export default UserProtectedWrapper