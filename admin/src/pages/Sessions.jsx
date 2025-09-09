import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Link } from 'react-router-dom'

const Sessions = () => {
  const [sessions, setSessions] = React.useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  async function fetchSessions(){
    setIsLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/admin/getAllSessions`,{
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`
        }
      });
      console.log(response.data);

      if(response.data.success){
        setSessions(response.data.sessions);
      }else{
        toast.error(response.data.msg);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to load sessions");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(()=>{
    fetchSessions();
  },[])

  // Filter sessions based on search term
  const filteredSessions = sessions.filter(session => 
    session.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    session.shortDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (session.clubName && session.clubName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Format date to readable format
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  
  return (
    <div className="px-4 py-8 md:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Upcoming Sessions</h1>
          <p className="text-gray-600 mt-2">View and manage all club recruitment sessions</p>
        </div>
        
        {/* Search Bar */}
        <div className="w-full md:w-auto mt-4 md:mt-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a4b8e] focus:border-[#1a4b8e] outline-none"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1a4b8e]"></div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">No sessions found</h3>
          <p className="mt-2 text-sm text-gray-500">There are no upcoming sessions scheduled at this time.</p>
        </div>
      ) : (
        <>
          {/* Sessions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSessions.map((session) => (
              <Link 
                to={`/session/${session._id}`} 
                key={session._id} 
                className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-[1.02] hover:shadow-lg"
              >
                {/* Color Bar on top with date */}
                <div className="bg-[#1a4b8e] text-white px-4 py-3 flex justify-between items-center">
                  <span className="font-medium">{formatDate(session.date)}</span>
                  <span className="text-sm">
                    {session.time} • {session.duration} mins
                  </span>
                </div>
                
                <div className="p-5">
                  {/* Title and Club */}
                  <div className="mb-3">
                    <h3 className="text-lg font-bold text-gray-800 mb-1 line-clamp-2">{session.title}</h3>
                    <p className="text-sm text-[#1a4b8e] font-medium">
                      {session.clubId.name || "Club Name"}
                    </p>
                  </div>
                  
                  {/* Short Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {session.shortDescription}
                  </p>
                  
                  {/* Venue with Icon */}
                  <div className="flex items-center text-gray-500 text-sm">
                    <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {session.venue}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
          {/* No Results from Search */}
          {searchTerm && filteredSessions.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 text-center mt-6">
              <p className="text-gray-500">No sessions match your search criteria.</p>
              <button 
                onClick={() => setSearchTerm('')}
                className="mt-3 text-[#1a4b8e] font-medium hover:underline"
              >
                Clear search
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Sessions