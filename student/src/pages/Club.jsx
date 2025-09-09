import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios';
import { toast } from 'react-toastify';

const Club = () => {

  const [club, setClub] = React.useState(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const { clubId } = useParams();

  async function fetchClub() {
    setIsLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/student/getClub`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        params: { clubId }
      });
      if (response.data.success) {
        setClub(response.data.club);
      } else {
        toast.error(response.data.msg);
      }
    } catch (error) {
      console.error("Error fetching club:", error);
      toast.error("Failed to load club");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchClub();
  }, [clubId]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <div className="mb-6">
          <Link 
            to="/clubs" 
            className="inline-flex items-center text-[#1a4b8e] hover:text-[#153c70] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Clubs
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1a4b8e]"></div>
          </div>
        ) : club ? (
          <>
            {/* Club Header */}
            <div className="bg-[#1a4b8e] rounded-lg shadow-lg overflow-hidden mb-6">
              <div className="px-6 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div className="flex items-center">
                    <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center text-[#1a4b8e] text-2xl font-bold">
                      {club.name.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <h1 className="text-2xl md:text-3xl font-bold text-white">{club.name}</h1>
                      {club.shortDescription && (
                        <p className="mt-1 text-blue-100">{club.shortDescription}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Club Details */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">About the Club</h2>
                {club.longDescription && (
                  <div className="prose max-w-none text-gray-600 mb-6">
                    <p className="whitespace-pre-wrap">{club.longDescription}</p>
                  </div>
                )}
                
                {club.achivements && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Achievements</h3>
                    <div className="prose max-w-none text-gray-600">
                      <p className="whitespace-pre-wrap">{club.achivements}</p>
                    </div>
                  </div>
                )}
                
                {club.recruitmentMethods && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Recruitment Methods</h3>
                    <div className="prose max-w-none text-gray-600">
                      <p className="whitespace-pre-wrap">{club.recruitmentMethods}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Contact Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {club.contactEmail && (
                    <div className="flex items-start">
                      <div className="rounded-full bg-blue-50 p-2 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e]" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <a href={`mailto:${club.contactEmail}`} className="font-medium text-[#1a4b8e] hover:underline">
                          {club.contactEmail}
                        </a>
                      </div>
                    </div>
                  )}

                  {club.contactPhone && (
                    <div className="flex items-start">
                      <div className="rounded-full bg-blue-50 p-2 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e]" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <a href={`tel:${club.contactPhone}`} className="font-medium text-[#1a4b8e] hover:underline">
                          {club.contactPhone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Club Activities */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Club Activities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link
                    to={`/events/club/${clubId}`}
                    className="flex items-center p-4 rounded-md border border-gray-200 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <div className="rounded-full bg-[#1a4b8e] p-3 mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-lg text-gray-900">Active Events</h3>
                      <p className="text-gray-600">View recruitment events and opportunities</p>
                    </div>
                  </Link>
                  
                  <Link
                    to={`/sessions/club/${clubId}`}
                    className="flex items-center p-4 rounded-md border border-gray-200 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <div className="rounded-full bg-[#1a4b8e] p-3 mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-lg text-gray-900">Active Sessions</h3>
                      <p className="text-gray-600">Explore workshops and learning sessions</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Social Links */}
            {(club.website || club.instagram || club.linkedin) && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Connect with {club.name}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {club.website && (
                      <a 
                        href={club.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center p-3 rounded-md border border-gray-200 hover:bg-blue-50 transition-colors"
                      >
                        <div className="rounded-full bg-blue-50 p-2 mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e]" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="font-medium text-gray-700">Website</span>
                      </a>
                    )}

                    {club.instagram && (
                      <a 
                        href={club.instagram} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center p-3 rounded-md border border-gray-200 hover:bg-blue-50 transition-colors"
                      >
                        <div className="rounded-full bg-blue-50 p-2 mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                        </div>
                        <span className="font-medium text-gray-700">Instagram</span>
                      </a>
                    )}

                    {club.linkedin && (
                      <a 
                        href={club.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center p-3 rounded-md border border-gray-200 hover:bg-blue-50 transition-colors"
                      >
                        <div className="rounded-full bg-blue-50 p-2 mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                          </svg>
                        </div>
                        <span className="font-medium text-gray-700">LinkedIn</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Club not found</h3>
            <p className="mt-1 text-sm text-gray-500">This club might have been removed or the ID is invalid.</p>
            <div className="mt-6">
              <Link
                to="/clubs"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#1a4b8e] hover:bg-[#153c70] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a4b8e]"
              >
                Go back to Clubs
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Club