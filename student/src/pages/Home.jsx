
import React from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const Home = () => {
  const [events, setEvents] = React.useState([]);
  const [sessions, setSessions] = React.useState([]);
  const navigate = useNavigate();

  async function fetchData() {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URI}/student/getDashBoard`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (response.data.success) {
        setEvents(response.data.events || []);
        setSessions(response.data.sessions || []);
      }
    } catch (err) {
      // handle error (optional: toast)
    }
  }

  React.useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-600 flex flex-col items-center px-2 py-6">
      <div className="w-full max-w-4xl bg-white/90 rounded-2xl shadow-xl p-6 md:p-10 flex flex-col gap-6 mt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-blue-900 text-center md:text-left">Welcome to Club Recruitment Portal</h1>
          <div className="flex flex-wrap gap-2 justify-center md:justify-end">
            <Link to="/clubs" className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-4 py-2 rounded-lg transition">Clubs</Link>
            <Link to="/events" className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-4 py-2 rounded-lg transition">Events</Link>
            <Link to="/sessions" className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-4 py-2 rounded-lg transition">Sessions</Link>
            <Link to="/profile" className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-4 py-2 rounded-lg transition">Profile</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Upcoming Events */}
          <div className="bg-blue-50 rounded-xl shadow p-5 flex flex-col">
            <h2 className="text-2xl font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-6 bg-blue-800 rounded-full mr-2"></span>Events
            </h2>
            {events && events.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {events.slice(0, 5).map((event, idx) => (
                  <li key={event._id || idx} className="bg-white rounded-lg shadow flex flex-col md:flex-row md:items-center justify-between px-4 py-4 border border-blue-100 hover:shadow-lg transition">
                    <div className="flex-1">
                      <div className="font-bold text-blue-900 text-lg mb-1">{event.title}</div>
                      <div className="text-sm text-gray-600 mb-1">{event.clubName}</div>
                      <div className="text-xs text-gray-500 mb-1">Registration Deadline: <span className="font-semibold">{event.registerationDeadline ? new Date(event.registerationDeadline).toLocaleDateString() : "-"}</span></div>
                      <div className="text-xs text-gray-500 mb-1">Max Participants: <span className="font-semibold">{event.maxParticipants}</span></div>
                      <div className="text-xs text-gray-700 mb-1 line-clamp-2">{event.shortDescription}</div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {event.ContactInfo && event.ContactInfo.length > 0 && event.ContactInfo.map((c, i) => (
                          <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{c}</span>
                        ))}
                      </div>
                    </div>
                    <Link to={`/event/${event._id}`} className="mt-3 md:mt-0 bg-blue-700 hover:bg-blue-900 text-white px-4 py-2 rounded transition text-sm font-semibold">View</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500 text-center py-6">No upcoming events</div>
            )}
          </div>

          {/* Upcoming Sessions */}
          <div className="bg-blue-50 rounded-xl shadow p-5 flex flex-col">
            <h2 className="text-2xl font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-6 bg-blue-800 rounded-full mr-2"></span>Sessions
            </h2>
            {sessions && sessions.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {sessions.slice(0, 5).map((session, idx) => (
                  <li key={session._id || idx} className="bg-white rounded-lg shadow flex flex-col md:flex-row md:items-center justify-between px-4 py-4 border border-blue-100 hover:shadow-lg transition">
                    <div className="flex-1">
                      <div className="font-bold text-blue-900 text-lg mb-1">{session.title}</div>
                      <div className="text-sm text-gray-600 mb-1">{session.clubName}</div>
                      <div className="text-xs text-gray-500 mb-1">Date: <span className="font-semibold">{session.date ? new Date(session.date).toLocaleDateString() : "-"}</span> &nbsp; Time: <span className="font-semibold">{session.time}</span></div>
                      <div className="text-xs text-gray-500 mb-1">Venue: <span className="font-semibold">{session.venue}</span> &nbsp; Duration: <span className="font-semibold">{session.duration} min</span></div>
                      <div className="text-xs text-gray-700 mb-1 line-clamp-2">{session.shortDescription}</div>
                    </div>
                    <Link to={`/session/${session._id}`} className="mt-3 md:mt-0 bg-blue-700 hover:bg-blue-900 text-white px-4 py-2 rounded transition text-sm font-semibold">View</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500 text-center py-6">No upcoming sessions</div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500 text-xs">&copy; {new Date().getFullYear()} Club Recruitment Portal | Made with <span className="text-red-500">&#10084;</span> at IITR</div>
      </div>
    </div>
  );
};

export default Home;