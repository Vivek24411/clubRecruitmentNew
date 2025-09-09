import axios from 'axios'
import React, { useState, useEffect } from 'react'
import { toast } from 'react-toastify';
import { Link, useNavigate } from 'react-router-dom';

const Clubs = () => {
  const [clubs, setClubs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  async function fetchClubs(){
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/admin/getAllClubs`,{
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`
        }
      });

      if(response.data.success){
        setClubs(response.data.clubs);
      }else{
        toast.error(response.data.msg);
      }
    } catch (error) {
      console.error("Error fetching clubs:", error);
      toast.error("Failed to load clubs");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(()=>{
    fetchClubs();
  },[])

  // Filter clubs based on search term
  const filteredClubs = clubs.filter(club => 
    club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    club.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (club.shortDescription && club.shortDescription.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const navigateToClubDetails = (clubId) => {
    navigate(`/club/${clubId}`);
  }

  if(isLoading){
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1a4b8e]"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 md:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Registered Clubs</h1>
          <p className="text-gray-600 mt-2">View and manage all registered clubs</p>
        </div>
        
        {/* Search Bar */}
        <div className="w-full md:w-auto mt-4 md:mt-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Search clubs..."
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
      
      {/* Clubs Grid */}
      {clubs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">No clubs found</h3>
          <p className="mt-2 text-sm text-gray-500">There are no registered clubs at this time.</p>
          <Link 
            to="/addClub" 
            className="mt-4 inline-block bg-[#1a4b8e] text-white px-4 py-2 rounded-lg hover:bg-[#143b72] transition-colors"
          >
            Add Club
          </Link>
        </div>
      ) : filteredClubs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-500">No clubs match your search criteria.</p>
          <button 
            onClick={() => setSearchTerm('')}
            className="mt-3 text-[#1a4b8e] font-medium hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredClubs.map((club) => (
            <div 
              key={club._id} 
              className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-[1.02] hover:shadow-lg cursor-pointer"
              onClick={() => navigateToClubDetails(club._id)}
            >
              <div className="bg-[#1a4b8e] px-4 py-3 text-white">
                <h3 className="font-bold text-lg truncate">{club.name}</h3>
              </div>
              <div className="p-4">
                {club.shortDescription ? (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {club.shortDescription}
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm italic mb-4">
                    No description available
                  </p>
                )}
                
                <div className="flex justify-end">
                  <button 
                    className="text-[#1a4b8e] text-sm font-medium hover:underline flex items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToClubDetails(club._id);
                    }}
                  >
                    View Details
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Clubs