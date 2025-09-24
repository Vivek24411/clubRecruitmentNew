import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import axios from 'axios'
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom'

const Events = () => {
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('deadline')
  const navigate = useNavigate();
  const today = new Date();

  async function fetchEvents() {
    setIsLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/student/getEvents`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
      });

      if (response.data.success) {
        setEvents(response.data.events);
      } else {
        toast.error(response.data.msg);
      }
    } catch (error) {
      
      toast.error("Failed to fetch events");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  // Filter and sort events
  const filteredEvents = events.filter(event => {
    // Search filter
    const searchMatch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (event.shortDescription && event.shortDescription.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (event.eligibility && event.eligibility.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Status filter
    const eventDeadline = new Date(event.registerationDeadline);
    const isActive = eventDeadline > today;
    
    if (filter === 'all') return searchMatch;
    if (filter === 'active' && isActive) return searchMatch;
    if (filter === 'closed' && !isActive) return searchMatch;
    
    return false;
  });

  // Sort events
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (sortBy === 'deadline') {
      return new Date(a.registerationDeadline) - new Date(b.registerationDeadline);
    } else if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    } else if (sortBy === 'club') {
      return (a.clubId?.name || '').localeCompare(b.clubId?.name || '');
    }
    return 0;
  });

  // Function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  function getDeadline(date) {
    const [y, m, d] = date.split("-");
    const deadline = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      23,
      59,
      59,
      999
    );
    return deadline;
  };

  // Function to check if event deadline has passed
  const isDeadlinePassed = (deadline) => {
    return getDeadline(deadline) < today;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-[#1a4b8e] to-[#2a5fa3] rounded-lg shadow-lg p-6 mb-8 text-white">
          <h1 className="text-3xl font-bold">Recruitment Events</h1>
          <p className="mt-2 text-lg opacity-90">
            Discover clubs that are currently recruiting new members
          </p>
        </div>

        {/* Search and filters */}
        <div className="bg-white rounded-lg shadow-md mb-8 p-5">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
                <input 
                  type="text" 
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#1a4b8e] focus:border-[#1a4b8e]"
                  placeholder="Search events..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {/* Filter */}
            <div className="w-full md:w-auto">
              <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                id="filter"
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-[#1a4b8e] focus:border-[#1a4b8e] rounded-md"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Events</option>
                <option value="active">Open Registration</option>
                <option value="closed">Closed Registration</option>
              </select>
            </div>
            
            {/* Sort */}
            <div className="w-full md:w-auto">
              <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
              <select
                id="sort"
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-[#1a4b8e] focus:border-[#1a4b8e] rounded-md"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="deadline">Deadline (Soonest first)</option>
                <option value="title">Title (A-Z)</option>
                <option value="club">Club (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1a4b8e]"></div>
          </div>
        ) : sortedEvents && sortedEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedEvents.map(event => {
              const deadlinePassed = isDeadlinePassed(event.registerationDeadline);
              
              return (
                <div key={event._id} className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden flex flex-col relative`}>
                  {/* Status Badge */}
                  {deadlinePassed ? (
                    <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full z-10">
                      Closed
                    </div>
                  ) : (
                    <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full z-10">
                      Open
                    </div>
                  )}

                  {/* Event Banner Image */}
                  <div className="w-full h-48 overflow-hidden">
                    {event.eventBanner ? (
                      <img 
                        src={event.eventBanner} 
                        alt={`${event.title} banner`} 
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://placehold.co/600x400/1a4b8e/FFF?text=Event";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-[#1a4b8e] to-[#2a5fa3] flex items-center justify-center">
                        <span className="text-white text-lg font-medium">{event.title}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Header */}
                  <div className="bg-[#1a4b8e] px-6 py-5 relative">
                    <div className="flex items-center mb-2">
                      {event.clubId && event.clubId.name && (
                        <span className="text-xs font-medium bg-blue-800 bg-opacity-50 text-white px-2 py-1 rounded-md">
                          {event.clubId.name}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold text-white">{event.title}</h2>
                    {event.shortDescription && (
                      <p className="mt-1 text-blue-100 text-sm line-clamp-2">{event.shortDescription}</p>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <div className="rounded-full bg-blue-50 p-2 mr-3 flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Registration Deadline</p>
                          <p className={`font-medium ${deadlinePassed ? 'text-red-600' : 'text-gray-800'}`}>
                            {formatDate(event.registerationDeadline)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="rounded-full bg-blue-50 p-2 mr-3 flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Team Size</p>
                          <p className="font-medium text-gray-800">{event.maxParticipants} Members</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="rounded-full bg-blue-50 p-2 mr-3 flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Selection Process</p>
                          <p className="font-medium text-gray-800">{event.numberOfRounds} Rounds</p>
                        </div>
                      </div>
                      
                      {event.eligibility && (
                        <div className="flex items-center">
                          <div className="rounded-full bg-blue-50 p-2 mr-3 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Eligibility</p>
                            <p className="font-medium text-gray-800">{event.eligibility}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-6">
                      <Link
                        to={`/event/${event._id}`}
                        className={`inline-flex w-full justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${
                          deadlinePassed 
                            ? 'text-gray-700 bg-gray-100 hover:bg-gray-200' 
                            : 'text-white bg-[#1a4b8e] hover:bg-[#153c70]'
                        } transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a4b8e]`}
                      >
                        {deadlinePassed ? 'View Details' : 'Apply Now'}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No matching events found</h3>
            <p className="mt-2 text-gray-500">
              {searchQuery 
                ? `No events match your search for "${searchQuery}". Try different keywords or clear filters.` 
                : filter !== 'all' 
                  ? `No ${filter === 'active' ? 'open' : 'closed'} registration events found. Try changing your filters.`
                  : "There are currently no recruitment events. Check back later for upcoming events."}
            </p>
            {(searchQuery || filter !== 'all') && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setFilter('all');
                }} 
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#1a4b8e] hover:bg-[#153c70]"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
        
        {/* Registration Stats Card */}
        {!isLoading && sortedEvents.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-[#1a4b8e] px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Event Registration Summary</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-3xl font-bold text-[#1a4b8e]">{sortedEvents.length}</p>
                  <p className="text-gray-600">Total Events</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-3xl font-bold text-green-600">
                    {sortedEvents.filter(event => new Date(event.registerationDeadline) > today).length}
                  </p>
                  <p className="text-gray-600">Open for Registration</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-3xl font-bold text-orange-600">
                    {sortedEvents.filter(event => {
                      const deadlineDate = new Date(event.registerationDeadline);
                      const threeDaysLater = new Date(today);
                      threeDaysLater.setDate(threeDaysLater.getDate() + 3);
                      return deadlineDate > today && deadlineDate < threeDaysLater;
                    }).length}
                  </p>
                  <p className="text-gray-600">Closing Soon</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-3xl font-bold text-red-600">
                    {sortedEvents.filter(event => new Date(event.registerationDeadline) < today).length}
                  </p>
                  <p className="text-gray-600">Closed Registration</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;