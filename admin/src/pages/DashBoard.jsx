import React from 'react'
import axios from 'axios'
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';


const DashBoard = () => {
  const navigate = useNavigate();
  const [clubCount, setClubCount] = React.useState(0);
  const [studentCount, setStudentCount] = React.useState(0);
  const [eventCount, setEventCount] = React.useState(0);
  const [sessionCount, setSessionCount] = React.useState(0);
  const [sessions, setSessions] = React.useState([]);
  const [events, setEvents] = React.useState([]);
  const [nextEvent, setNextEvent] = React.useState(null);
  const [nextSession, setNextSession] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  async function fetchDashBoardData(){
    setIsLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/admin/getDashBoard`,{
        headers: {  
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`
        }
      });

      console.log("Dashboard Data:", response.data);
      
      if(response.data.success){
        // Fix: Access data from dashboard object within response.data
        const { dashboard } = response.data;
        setClubCount(dashboard.clubsCount);
        setStudentCount(dashboard.studentsCount);
        setEventCount(dashboard.eventsCount);
        setSessionCount(dashboard.sessionsCount);
        
        const allEvents = dashboard.events || [];
        const allSessions = dashboard.sessions || [];
        
        setSessions(allSessions);
        setEvents(allEvents);
        
        // Find the most upcoming event (closest date)
        if (allEvents.length > 0) {
          const upcomingEvents = allEvents
            .filter(event => new Date(event.registerationDeadline) >= new Date())
            .sort((a, b) => new Date(a.registerationDeadline) - new Date(b.registerationDeadline));
          
          setNextEvent(upcomingEvents.length > 0 ? upcomingEvents[0] : allEvents[0]);
        }
        
        // Find the most upcoming session (closest date)
        if (allSessions.length > 0) {
          const upcomingSessions = allSessions
            .filter(session => new Date(session.date) >= new Date())
            .sort((a, b) => new Date(a.date) - new Date(b.date));
          
          setNextSession(upcomingSessions.length > 0 ? upcomingSessions[0] : allSessions[0]);
        }
      }else{
        toast.error(response.data.msg);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(()=>{
    fetchDashBoardData();
  },[])

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-600 flex flex-col items-center px-2 py-6">
      <div className="w-full max-w-6xl bg-white/90 rounded-2xl shadow-xl p-6 md:p-10 flex flex-col gap-6 mt-6">
        {/* Header & Navigation */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-blue-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage the club recruitment platform</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center md:justify-end">
            <Link to="/clubs" className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-4 py-2 rounded-lg transition">Clubs</Link>
            <Link to="/events" className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-4 py-2 rounded-lg transition">Events</Link>
            <Link to="/sessions" className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-4 py-2 rounded-lg transition">Sessions</Link>
            <Link to="/profile" className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-4 py-2 rounded-lg transition">Profile</Link>
            <Link to="/addclub" className="bg-green-700 hover:bg-green-800 text-white font-semibold px-4 py-2 rounded-lg transition">+ New Club</Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl p-5 shadow-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-white/80 text-sm">Total Clubs</p>
                <h3 className="text-3xl font-bold mt-1">{clubCount}</h3>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <Link to="/clubs" className="inline-block mt-4 text-sm text-white/90 hover:text-white font-medium">View All Clubs →</Link>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-700 text-white rounded-xl p-5 shadow-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-white/80 text-sm">Total Events</p>
                <h3 className="text-3xl font-bold mt-1">{eventCount}</h3>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <Link to="/events" className="inline-block mt-4 text-sm text-white/90 hover:text-white font-medium">View All Events →</Link>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-xl p-5 shadow-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-white/80 text-sm">Total Sessions</p>
                <h3 className="text-3xl font-bold mt-1">{sessionCount}</h3>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <Link to="/sessions" className="inline-block mt-4 text-sm text-white/90 hover:text-white font-medium">View All Sessions →</Link>
          </div>
          
          <div className="bg-gradient-to-br from-amber-500 to-amber-700 text-white rounded-xl p-5 shadow-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-white/80 text-sm">Total Students</p>
                <h3 className="text-3xl font-bold mt-1">{studentCount}</h3>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998a12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
              </div>
            </div>
            <span className="inline-block mt-4 text-sm text-white/90 hover:text-white font-medium">All Registered Students</span>
          </div>
        </div>

      

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          {/* Next Upcoming Event */}
          <div className="bg-blue-50 rounded-xl shadow p-5 flex flex-col">
            <h2 className="text-2xl font-semibold text-blue-800 mb-3 flex items-center justify-between">
              <div className="flex items-center">
                <span className="inline-block w-2 h-6 bg-blue-800 rounded-full mr-2"></span>Next Upcoming Event
              </div>
              <Link to="/events" className="text-sm text-blue-700 hover:text-blue-900">View All Events</Link>
            </h2>
            
            {nextEvent ? (
              <div className="bg-white rounded-lg shadow flex flex-col px-4 py-6 border border-blue-100 hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-3">
                  <div className="font-bold text-blue-900 text-xl">{nextEvent.title}</div>
                  <div className="flex flex-col items-end">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mb-1">
                      Deadline: {nextEvent.registerationDeadline ? formatDate(nextEvent.registerationDeadline) : "-"}
                    </span>
                    {new Date(nextEvent.registerationDeadline) >= new Date() ? (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Registration Open</span>
                    ) : (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Registration Closed</span>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-gray-700 mb-4">{nextEvent.shortDescription}</div>
                
                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div className="text-gray-500">Max Participants: <span className="font-semibold">{nextEvent.maxParticipants}</span></div>
                  <div className="text-gray-500">Rounds: <span className="font-semibold">{nextEvent.numberOfRounds}</span></div>
                  <div className="text-gray-500">Eligibility: <span className="font-semibold">{nextEvent.eligibility}</span></div>
                  <div className="text-gray-500">Created: <span className="font-semibold">{nextEvent.createdAt ? formatDate(nextEvent.createdAt) : "-"}</span></div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {nextEvent.ContactInfo && nextEvent.ContactInfo.length > 0 && nextEvent.ContactInfo.map((contact, i) => (
                    <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{contact}</span>
                  ))}
                </div>
                
                <div className="flex flex-wrap gap-3 mt-1">
                  <Link to={`/event/${nextEvent._id}`} className="bg-blue-700 hover:bg-blue-900 text-white px-4 py-2 rounded text-sm font-semibold transition flex-1 text-center">View Details</Link>
                  <Link to={`/events`} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm font-semibold transition flex-1 text-center">All Events</Link>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-10">No upcoming events found.</div>
            )}
          </div>

          {/* Next Upcoming Session */}
          <div className="bg-blue-50 rounded-xl shadow p-5 flex flex-col">
            <h2 className="text-2xl font-semibold text-blue-800 mb-3 flex items-center justify-between">
              <div className="flex items-center">
                <span className="inline-block w-2 h-6 bg-blue-800 rounded-full mr-2"></span>Next Upcoming Session
              </div>
              <Link to="/sessions" className="text-sm text-blue-700 hover:text-blue-900">View All Sessions</Link>
            </h2>
            
            {nextSession ? (
              <div className="bg-white rounded-lg shadow flex flex-col px-4 py-6 border border-blue-100 hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-3">
                  <div className="font-bold text-blue-900 text-xl">{nextSession.title}</div>
                  <div className="flex flex-col items-end">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mb-1">
                      {nextSession.date ? formatDate(nextSession.date) : "-"} | {nextSession.time}
                    </span>
                    {new Date(nextSession.date) >= new Date() ? (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Upcoming</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">Past</span>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-gray-700 mb-4">{nextSession.shortDescription}</div>
                
                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div className="flex items-center text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Venue: <span className="font-semibold ml-1">{nextSession.venue}</span>
                  </div>
                  <div className="flex items-center text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Duration: <span className="font-semibold ml-1">{nextSession.duration} min</span>
                  </div>
                  <div className="flex items-center text-gray-500 col-span-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Expires: <span className="font-semibold ml-1">{nextSession.expiresAt ? formatDate(nextSession.expiresAt) + ' ' + new Date(nextSession.expiresAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "-"}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3 mt-1">
                  <Link to={`/session/${nextSession._id}`} className="bg-blue-700 hover:bg-blue-900 text-white px-4 py-2 rounded text-sm font-semibold transition flex-1 text-center">View Details</Link>
                  <Link to={`/sessions`} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm font-semibold transition flex-1 text-center">All Sessions</Link>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-10">No upcoming sessions found.</div>
            )}
          </div>
        </div>
      )}
      
      <div className="mt-8 text-center text-gray-500 text-xs">&copy; {new Date().getFullYear()} Club Recruitment Portal | Made with <span className="text-red-500">&#10084;</span> at IITR</div>
    </div>
  </div>
  )
}

export default DashBoard