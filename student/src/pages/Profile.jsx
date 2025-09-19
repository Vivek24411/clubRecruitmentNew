import React, { useState } from 'react'
import { StudentContextData } from '../context/StudentContext'
import { useContext } from 'react'
import { toast } from 'react-toastify'
import { useEffect } from 'react'
import {useNavigate} from 'react-router-dom'

const Profile = () => {
  const { profile } = useContext(StudentContextData);
  const [isLoading, setIsLoading] = useState(!profile);
  const navigate = useNavigate(); 

  console.log(profile);

   function logout(){
    localStorage.removeItem("token");
    navigate("/login");
    toast.success("Logged out successfully");
  }

  useEffect(()=>{
    if(profile){
      setIsLoading(false);
    }
  },[profile])
  
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1a4b8e]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Student Profile</h1>
          <p className="text-gray-600 mt-2">View your profile information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Profile Header */}
          <div className="bg-[#1a4b8e] px-6 py-4">
            <div className="flex items-center">
              <div className="bg-white rounded-full h-16 w-16 flex items-center justify-center text-[#1a4b8e] text-xl font-bold">
                {profile?.name?.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-bold text-white">{profile?.name}</h2>
                <p className="text-blue-100">Student</p>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-6">
                {/* Email */}
                <div>
                  <p className="text-sm font-medium text-gray-500">Email Address</p>
                  <div className="mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <p className="text-gray-900 font-medium">{profile?.email}</p>
                  </div>
                </div>

                {/* Branch */}
                <div>
                  <p className="text-sm font-medium text-gray-500">Branch</p>
                  <div className="mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1-3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-900 font-medium">{profile?.branch || "Not specified"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* ID */}
                <div>
                  <p className="text-sm font-medium text-gray-500">Student ID</p>
                  <div className="mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 006 0h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 4a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm-1 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-900 font-medium truncate">{profile?._id}</p>
                  </div>
                </div>

                {/* Year */}
                <div>
                  <p className="text-sm font-medium text-gray-500">Year of Study</p>
                  <div className="mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 12.094A5.973 5.973 0 004 15v1H1v-1a3 3 0 013.75-2.906z" />
                    </svg>
                    <p className="text-gray-900 font-medium">
                      {profile?.year ? `${profile.year}${getYearSuffix(profile.year)} Year` : "Not specified"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Actions */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
               <button className='inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1a4b8e] hover:bg-[#153c70] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a4b8e]' onClick={logout}>Logout</button>
                <button 
                  className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1a4b8e] hover:bg-[#153c70] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a4b8e]"
                  onClick={() => toast.info("Edit profile functionality coming soon!")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Edit Profile
                </button>
                <button 
                  className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a4b8e]"
                  onClick={() => toast.info("Change password functionality coming soon!")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Change Password
                </button>
              </div>
            </div>
          </div>
        </div>

       
      </div>
    </div>
  )
}

// Helper function to get the suffix for year (1st, 2nd, 3rd, 4th)
const getYearSuffix = (year) => {
  const num = parseInt(year);
  if (isNaN(num)) return '';
  
  if (num === 1) return 'st';
  if (num === 2) return 'nd';
  if (num === 3) return 'rd';
  return 'th';
};

export default Profile