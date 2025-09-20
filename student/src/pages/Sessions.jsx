import React, { useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom'


const Sessions = () => {
  const [sessions, setSessions] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [clubNames, setClubNames] = useState({})

  async function fetchSessions(){
    setIsLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/student/getSessions`,{
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if(response.data.success){
        setSessions(response.data.sessions);
      }else{
        toast.error(response.data.msg);
      }
    } catch (error) {

      toast.error("Failed to load sessions");
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(()=>{
    fetchSessions();
  },[])

  // Format date to a more readable format
  const formatDate = (dateString) => {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Filter sessions based on search term
  const filteredSessions = sessions.filter(session => {
    const searchLower = searchTerm.toLowerCase();
    return (
      session.title.toLowerCase().includes(searchLower) ||
      session.shortDescription.toLowerCase().includes(searchLower) ||
      (clubNames[session.clubId] && clubNames[session.clubId].toLowerCase().includes(searchLower)) ||
      session.venue.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Upcoming Sessions</h1>
          <p className="mt-1 text-gray-600">Explore sessions hosted by various clubs</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search for sessions, clubs, or venues..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#1a4b8e] focus:border-[#1a4b8e] sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Sessions List */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1a4b8e]"></div>
          </div>
        ) : filteredSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSessions.map(session => (
              <div key={session._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="bg-[#1a4b8e] px-4 py-3 text-white">
                  <h2 className="font-bold text-xl truncate">{session.title}</h2>
                  <p className="text-sm text-blue-200 mt-1">
                    {session.clubId.name || "Loading club name..."}
                  </p>
                </div>
                
                <div className="p-4">
                  {session.shortDescription && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {session.shortDescription}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    {/* Date & Time */}
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e] mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{formatDate(session.date)}</p>
                        <p className="text-sm text-gray-500">{session.time} • {session.duration} minutes</p>
                      </div>
                    </div>
                    
                    {/* Venue */}
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e] mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-900">{session.venue}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* View Details Button */}
                  <div className="mt-4 flex justify-end">
                    <Link
                      to={`/session/${session._id}`}
                      className="inline-flex items-center px-3 py-1.5 border border-[#1a4b8e] text-sm leading-4 font-medium rounded-md text-[#1a4b8e] bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a4b8e]"
                    >
                      View Details
                      <svg xmlns="http://www.w3.org/2000/svg" className="ml-1.5 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {searchTerm ? (
              <>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No matching sessions</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search terms.</p>
              </>
            ) : (
              <>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming sessions</h3>
                <p className="mt-1 text-sm text-gray-500">Check back later for new sessions.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Sessions