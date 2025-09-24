import React from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'

const Dashboard = () => {
  const [sessions, setSessions] = React.useState([])
  const [events, setEvents] = React.useState([])
  const [nextEvent, setNextEvent] = React.useState(null)
  const [nextSession, setNextSession] = React.useState(null)
  const navigate = useNavigate();

  async function fetchData() {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URI}/club/getDashBoard`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("clubToken")}`,
          },
        }
      );
 
      
      if(response.data.success) {
        const allSessions = response.data.sessions || [];
        const allEvents = response.data.events || [];
        
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
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  }

  React.useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-600 flex flex-col items-center px-2 py-6">
      <div className="w-full max-w-4xl bg-white/90 rounded-2xl shadow-xl p-6 md:p-10 flex flex-col gap-6 mt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-blue-900 text-center md:text-left">Club Dashboard</h1>
          <div className="flex flex-wrap gap-2 justify-center md:justify-end">
            <Link to="/events" className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-4 py-2 rounded-lg transition">Events</Link>
            <Link to="/sessions" className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-4 py-2 rounded-lg transition">Sessions</Link>
            <Link to="/profile" className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-4 py-2 rounded-lg transition">Profile</Link>
            <Link to="/addEvent" className="bg-green-700 hover:bg-green-800 text-white font-semibold px-4 py-2 rounded-lg transition">+ New Event</Link>
            <Link to="/addSession" className="bg-green-700 hover:bg-green-800 text-white font-semibold px-4 py-2 rounded-lg transition">+ New Session</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Club Events */}
          <div className="bg-blue-50 rounded-xl shadow p-5 flex flex-col">
            <h2 className="text-2xl font-semibold text-blue-800 mb-3 flex items-center justify-between">
              <div className="flex items-center">
                <span className="inline-block w-2 h-6 bg-blue-800 rounded-full mr-2"></span>Event
              </div>
              <Link to="/events" className="text-sm text-blue-700 hover:text-blue-900">View All Events</Link>
            </h2>
            {nextEvent ? (
              <div className="bg-white rounded-lg shadow flex flex-col px-4 py-6 border border-blue-100 hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-3">
                  <div className="font-bold text-blue-900 text-xl">{nextEvent.title}</div>
                  <div className="flex flex-col items-end">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mb-1">
                      Deadline: {nextEvent.registerationDeadline ? new Date(nextEvent.registerationDeadline).toLocaleDateString() : "-"}
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
                  <div className="text-gray-500">Created: <span className="font-semibold">{nextEvent.createdAt ? new Date(nextEvent.createdAt).toLocaleDateString() : "-"}</span></div>
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
              <div className="text-gray-500 text-center py-10 flex flex-col items-center gap-3">
                <p>No events created yet</p>
                <Link to="/addEvent" className="bg-blue-700 hover:bg-blue-900 text-white px-4 py-2 rounded text-sm font-semibold transition">Create Your First Event</Link>
              </div>
            )}
          </div>

          {/* Club Sessions */}
          <div className="bg-blue-50 rounded-xl shadow p-5 flex flex-col">
            <h2 className="text-2xl font-semibold text-blue-800 mb-3 flex items-center justify-between">
              <div className="flex items-center">
                <span className="inline-block w-2 h-6 bg-blue-800 rounded-full mr-2"></span>Session
              </div>
              <Link to="/sessions" className="text-sm text-blue-700 hover:text-blue-900">View All Sessions</Link>
            </h2>
            {nextSession ? (
              <div className="bg-white rounded-lg shadow flex flex-col px-4 py-6 border border-blue-100 hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-3">
                  <div className="font-bold text-blue-900 text-xl">{nextSession.title}</div>
                  <div className="flex flex-col items-end">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mb-1">
                      {nextSession.date ? new Date(nextSession.date).toLocaleDateString() : "-"} | {nextSession.time}
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
                    Expires: <span className="font-semibold ml-1">{nextSession.expiresAt ? new Date(nextSession.expiresAt).toLocaleDateString() + ' ' + new Date(nextSession.expiresAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "-"}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3 mt-1">
                  <Link to={`/session/${nextSession._id}`} className="bg-blue-700 hover:bg-blue-900 text-white px-4 py-2 rounded text-sm font-semibold transition flex-1 text-center">View Details</Link>
                  <Link to={`/sessions`} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm font-semibold transition flex-1 text-center">All Sessions</Link>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-10 flex flex-col items-center gap-3">
                <p>No sessions created yet</p>
                <Link to="/addSession" className="bg-blue-700 hover:bg-blue-900 text-white px-4 py-2 rounded text-sm font-semibold transition">Create Your First Session</Link>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500 text-xs">&copy; {new Date().getFullYear()} Club Recruitment Portal | Made with <span className="text-red-500">&#10084;</span> at IITR</div>
      </div>
    </div>
  )
}

export default Dashboard