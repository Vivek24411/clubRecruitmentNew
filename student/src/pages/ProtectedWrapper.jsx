import React from 'react'
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ProtectedWrapper = ({children}) => {

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

 

  useEffect(() => {
    if(!token){
      navigate('/login');
    }
  }, [token]);

   if(!token){
    return null;
  }



  return (
    <>
    {children}
    </>
  )
}

export default ProtectedWrapper