import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'react-toastify';

const Session = () => {
  const { sessionId } = useParams();
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchSessionDetails() {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URI}/admin/getSessionDetail`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`
          },
          params: {
            sessionId
          }
        }
      );

      if (response.data.success) {
        setSessionDetails(response.data.session);
      } else {
        toast.error(response.data.msg);
      }
    } catch (error) {
      console.error("Error fetching session details:", error);
      toast.error("Failed to load session details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId])

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1a4b8e]"></div>
      </div>
    );
  }

  if (!sessionDetails) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <h1 className="text-2xl font-bold text-red-500">Session Not Found</h1>
        <p className="text-gray-600 mt-2">The requested session could not be found.</p>
        <Link to="/sessions" className="mt-4 bg-[#1a4b8e] text-white px-4 py-2 rounded-lg hover:bg-[#143b72] transition-colors">
          Back to Sessions
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link 
            to="/sessions" 
            className="inline-flex items-center text-[#1a4b8e] font-medium hover:underline"
          >
            <svg className="h-5 w-5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Back to Sessions
          </Link>
        </div>
      
        {/* Header with basic info */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="bg-[#1a4b8e] px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <h1 className="text-2xl font-bold text-white">{sessionDetails.title}</h1>
              <span className="mt-2 md:mt-0 px-3 py-1 text-sm rounded-full bg-white text-[#1a4b8e] font-medium">
                {sessionDetails.clubId && sessionDetails.clubId.name ? sessionDetails.clubId.name : 'Unknown Club'}
              </span>
            </div>
            <p className="mt-2 text-blue-100">{sessionDetails.shortDescription}</p>
          </div>
          
          {/* Session Meta Information */}
          <div className="p-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex items-center">
              <div className="rounded-full bg-gray-100 p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1a4b8e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Date</p>
                <p className="text-gray-900 font-medium">{formatDate(sessionDetails.date)}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="rounded-full bg-gray-100 p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1a4b8e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Time</p>
                <p className="text-gray-900 font-medium">{sessionDetails.time}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="rounded-full bg-gray-100 p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1a4b8e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Duration</p>
                <p className="text-gray-900 font-medium">{sessionDetails.duration} minutes</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="rounded-full bg-gray-100 p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1a4b8e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Venue</p>
                <p className="text-gray-900 font-medium">{sessionDetails.venue}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Description */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Description</h2>
            <div className="prose max-w-none text-gray-600">
              <p className="whitespace-pre-wrap">{sessionDetails.longDescription}</p>
            </div>
          </div>
        </div>
        
        
      </div>
    </div>
  );
}

export default Session