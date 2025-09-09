import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { Link } from 'react-router-dom'

const Clubs = () => {
  const [clubs, setClubs] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  async function fetchClubs() {
    setIsLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/student/getAllClubs`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.data.success) {
        setClubs(response.data.clubs);
      } else {
        toast.error(response.data.msg);
      }
    } catch (error) {
      console.error("Error fetching clubs:", error);
      toast.error("Failed to load clubs");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchClubs();
  }, [])
  
  // Filter clubs based on search term
  const filteredClubs = clubs ? clubs.filter(club => 
    club.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (club.shortDescription && club.shortDescription.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Campus Clubs</h1>
          <p className="mt-2 text-lg text-gray-600">
            Discover and join student clubs that match your interests
          </p>
          
          {/* Search Input */}
          <div className="mt-6 max-w-lg">
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search clubs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="focus:ring-[#1a4b8e] focus:border-[#1a4b8e] block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1a4b8e]"></div>
          </div>
        ) : clubs && clubs.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClubs.map((club) => (
                <Link 
                  key={club._id} 
                  to={`/club/${club._id}`}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="h-28 bg-[#1a4b8e] flex items-center justify-center">
                    <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center text-[#1a4b8e] text-2xl font-bold">
                      {club.name.charAt(0)}
                    </div>
                  </div>
                  <div className="p-5">
                    <h2 className="text-xl font-semibold text-gray-900">{club.name}</h2>
                    {club.shortDescription && (
                      <p className="mt-2 text-gray-600 line-clamp-3">{club.shortDescription}</p>
                    )}
                    <div className="mt-4 flex justify-end">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-[#1a4b8e]">
                        View Details
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            {/* No results message */}
            {filteredClubs.length === 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No clubs found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search term.</p>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No clubs available</h3>
            <p className="mt-1 text-sm text-gray-500">Check back later for club updates.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Clubs