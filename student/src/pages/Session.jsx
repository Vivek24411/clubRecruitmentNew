import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify';
import { useParams, useSearchParams, Link } from 'react-router-dom'

const Session = () => {
  const [sessionDetails, setSessionDetails] = React.useState(null)
  const [clubDetails, setClubDetails] = useState(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const { sessionId } = useParams();
  
  
 

  async function fetchSessionDetails(){
    setIsLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/student/getSession`,{
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        params: { sessionId }
      });
      console.log(response);
      

      if (response.data.success) {
        setSessionDetails(response.data.session);
        
      } else {
        toast.error(response.data.msg);
      }
    } catch (error) {
      console.error("Error fetching session details:", error);
      toast.error("Failed to load session details");
      setIsLoading(false);
    }finally{
      setIsLoading(false);
    }
  }
  
 
  useEffect(() => {
    if (sessionId) {
      fetchSessionDetails();
    } else {
      setIsLoading(false);
    }
  }, [sessionId]);
  
  // Format date to a more readable format
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Calculate remaining time until the session
  const getTimeRemaining = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return '';
    
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    const sessionDate = new Date(year, month - 1, day, hours, minutes);
    const currentDate = new Date();
    
    const diffTime = sessionDate - currentDate;
    if (diffTime < 0) return 'Session has ended';
    
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}, ${diffHours} hour${diffHours !== 1 ? 's' : ''} remaining`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''}, ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} remaining`;
    } else {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} remaining`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <div className="mb-6">
          <Link 
            to="/sessions" 
            className="inline-flex items-center text-[#1a4b8e] hover:text-[#153c70] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Sessions
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1a4b8e]"></div>
          </div>
        ) : sessionDetails ? (
          <>
            {/* Session Header */}
            <div className="bg-[#1a4b8e] rounded-lg shadow-lg overflow-hidden mb-6">
              <div className="px-6 py-8">
                <div className="flex flex-col md:flex-row md:items-start justify-between">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">{sessionDetails.title}</h1>
                    {sessionDetails.shortDescription && (
                      <p className="mt-2 text-blue-100 text-lg">{sessionDetails.shortDescription}</p>
                    )}
                    {clubDetails && (
                      <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-white bg-opacity-20 text-white text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 12.094A5.973 5.973 0 004 15v1H1v-1a3 3 0 013.75-2.906z" />
                        </svg>
                        Hosted by {clubDetails.name}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 md:mt-0 md:ml-6 md:text-right w-[30vw]">
                    <span className="inline-flex items-center px-2 py-1 rounded-lg bg-white bg-opacity-20 text-black text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      {getTimeRemaining(sessionDetails.date, sessionDetails.time)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Session Details */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Session Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center mb-4">
                      <div className="rounded-full bg-blue-50 p-2 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e]" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="font-medium text-gray-800">{formatDate(sessionDetails.date)}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="rounded-full bg-blue-50 p-2 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e]" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Time</p>
                        <p className="font-medium text-gray-800">{sessionDetails.time}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center mb-4">
                      <div className="rounded-full bg-blue-50 p-2 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e]" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Venue</p>
                        <p className="font-medium text-gray-800">{sessionDetails.venue}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="rounded-full bg-blue-50 p-2 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e]" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Duration</p>
                        <p className="font-medium text-gray-800">{sessionDetails.duration} minutes</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {sessionDetails.longDescription && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-3">About This Session</h2>
                  <div className="prose max-w-none text-gray-600">
                    <p className="whitespace-pre-wrap">{sessionDetails.longDescription}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Club Information */}
            {clubDetails && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">About the Club</h2>
                  <div className="flex items-center">
                    <div className="bg-[#1a4b8e] rounded-full h-12 w-12 flex items-center justify-center text-white font-bold text-xl">
                      {clubDetails.name.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{clubDetails.name}</h3>
                      {clubDetails.shortDescription && (
                        <p className="text-sm text-gray-600">{clubDetails.shortDescription}</p>
                      )}
                    </div>
                  </div>

                  {clubDetails.longDescription && (
                    <div className="mt-4 text-sm text-gray-600">
                      <p className="line-clamp-3">{clubDetails.longDescription}</p>
                    </div>
                  )}

                  <div className="mt-5">
                    <Link
                      to={`/club/${clubDetails._id}`}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#1a4b8e] hover:bg-[#153c70] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a4b8e]"
                    >
                      View Club Profile
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* RSVP Card */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-800">Interested in this session?</h2>
              </div>
              <div className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-center">
                  <div className="text-center sm:text-left mb-4 sm:mb-0">
                    <p className="text-gray-600 mb-1">
                      Register your interest in this session to receive updates and notifications.
                    </p>
                    <p className="text-sm text-gray-500">
                      You can cancel your RSVP at any time.
                    </p>
                  </div>
                  <button 
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1a4b8e] hover:bg-[#153c70] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a4b8e]"
                    onClick={() => toast.info("RSVP functionality coming soon!")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    RSVP for this Session
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No session found</h3>
            <p className="mt-1 text-sm text-gray-500">This session might have been removed or the ID is invalid.</p>
            <div className="mt-6">
              <Link
                to="/sessions"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#1a4b8e] hover:bg-[#153c70] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a4b8e]"
              >
                Go back to Sessions
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Session