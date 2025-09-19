import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

const Event = () => {
  const [event, setEvent] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [show, setShow] = React.useState(null);
  const [detail, setDetail] = React.useState(null);
  const [memberEmail, setMemberEmail] = React.useState("");
  
  // Helper function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  async function fetchEventDetails() {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URI}/student/getEvent`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          params: { eventId },
        }
      );
      if (response.data.success) {
        setEvent(response.data.event);
      } else {
        toast.error(response.data.msg);
      }
    } catch (error) {
      console.error("Error fetching event details:", error);
      toast.error("Failed to fetch event details");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister() {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/student/registerEvent`,
        {
          eventId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        toast.success("Registered successfully");
        // // Update local state to avoid having to refetch
        // setShow(1);
        // // Also refetch event details to get the latest data
        getEventDetails();
      } else {
        toast.error(response.data.msg || "Registration failed");
      }
    } catch (error) {
      console.error("Error registering for event:", error);
      toast.error("Failed to register for event. Please try again.");
    }
  }

  async function getEventDetails() {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URI}/student/getEventDetails`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          params: { eventId },
        }
      );

      console.log("Event details response:", response.data);

      if (response.data.success) {
        // Make sure we're explicitly converting to a number if needed
        const showValue = Number(response.data.Show);
        console.log("Registration status (show value):", showValue);
        setShow(showValue);
        setDetail(response.data.detail);
      } else {
        toast.error(response.data.msg || "Failed to get event details");
      }
    } catch (error) {
      console.error("Error fetching event details:", error);
      toast.error("Failed to load registration status");
    }
  }

  async function addMember() {
    const response = await axios.post(
      `${import.meta.env.VITE_BASE_URI}/student/addMemberOffer`,
      {
        eventId,
        memberEmail // Replace with actual email
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (response.data.success) {
      toast.success("Member added successfully");
      getEventDetails();
    } else {
      toast.error(response.data.msg || "Failed to add member");
    }
  }

  
  async function acceptMemberOffer(studentId) {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/student/acceptMemberOffer`,
        {
          eventId,
          studentId 
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        toast.success("Member accepted successfully");
        getEventDetails();
      } else {
        toast.error(response.data.msg || "Failed to accept member");
      }
    } catch (error) {
      console.error("Error accepting member:", error);
      toast.error("Failed to accept member. Please try again.");
    }
  }

  function getDeadline(date){
    const [y,m,d] = date.split('-');
    const deadline =  new Date(Number(y), Number(m) - 1, Number(d),23,59,59,999);
    return deadline;
  }

  React.useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  useEffect(() => {
    getEventDetails();
  }, [eventId]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <div className="mb-6">
          <Link
            to="/events"
            className="inline-flex items-center text-[#1a4b8e] hover:text-[#153c70] transition-colors group"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1 transform group-hover:-translate-x-1 transition-transform duration-200"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">Back to Events</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-64 space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-l-2 border-r-2 border-b-0 border-[#1a4b8e]"></div>
              <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
                <div className="h-12 w-12 rounded-full bg-blue-50"></div>
              </div>
              <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#1a4b8e] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <p className="text-[#1a4b8e] font-medium animate-pulse">Loading event details...</p>
          </div>
        ) : event ? (
          <>
            {/* Event Header */}
            <div className="bg-gradient-to-r from-[#1a4b8e] to-[#2a5fa3] rounded-lg shadow-xl overflow-hidden mb-8 relative">
              <div className="absolute top-0 right-0 h-full w-1/2 opacity-10">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full text-white" strokeWidth="0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#1a4b8e]/30 to-transparent opacity-50"></div>
              <div className="px-8 pt-10 pb-12 relative z-10">
                <div className="flex flex-col md:flex-row md:items-start justify-between">
                  <div className="mb-4 md:mb-0">
                    {/* Club name if available */}
                    {event.clubId && event.clubId.name && (
                      <div className="mb-3">
                        <span className="inline-flex items-center bg-blue-800 bg-opacity-30 text-blue-100 text-sm px-3 py-1 rounded-full shadow-sm backdrop-blur-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="font-medium">{event.clubId.name}</span>
                        </span>
                      </div>
                    )}
                    
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
                      {event.title}
                    </h1>
                    
                    {event.shortDescription && (
                      <p className="mt-2 text-blue-50 text-lg font-light leading-relaxed max-w-2xl">
                        {event.shortDescription}
                      </p>
                    )}
                    
                    <div className="mt-5 flex flex-wrap gap-3">
                      <span className="inline-flex items-center bg-blue-800/40 text-blue-50 text-sm px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm border border-blue-400/20 hover:bg-blue-800/50 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">Deadline: {formatDate(event.registerationDeadline)}</span>
                      </span>
                      
                      <span className="inline-flex items-center bg-blue-800/40 text-blue-50 text-sm px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm border border-blue-400/20 hover:bg-blue-800/50 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span className="font-medium">Team Size: {event.maxParticipants}</span>
                      </span>
                      
                      <span className="inline-flex items-center bg-blue-800/40 text-blue-50 text-sm px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm border border-blue-400/20 hover:bg-blue-800/50 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <span className="font-medium">{event.numberOfRounds} Rounds</span>
                      </span>
                    </div>
                  </div>
                  
                  {/* Registration status badge */}
                  <div className="md:text-right">
                    {new Date(event.registerationDeadline) > new Date() ? (
                      <span className="inline-flex items-center bg-green-600 text-white text-sm font-medium px-4 py-1.5 rounded-full shadow-md animate-pulse">
                        <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
                        Registration Open
                      </span>
                    ) : (
                      <span className="inline-flex items-center bg-red-600 text-white text-sm font-medium px-4 py-1.5 rounded-full shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Registration Closed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Event Details */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8 border border-gray-100 hover:shadow-lg transition-shadow duration-300">
              <div className="p-8">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-[#1a4b8e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Event Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors group">
                      <div className="rounded-full bg-[#1a4b8e]/90 p-3 mr-4 text-white shadow-md group-hover:scale-110 transition-transform">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">
                          Registration Deadline
                        </p>
                        <p className="font-semibold text-gray-800 text-lg">
                          {formatDate(event.registerationDeadline)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors group">
                      <div className="rounded-full bg-[#1a4b8e]/90 p-3 mr-4 text-white shadow-md group-hover:scale-110 transition-transform">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">
                          Max Participants
                        </p>
                        <p className="font-semibold text-gray-800 text-lg">
                          {event.maxParticipants}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors group">
                      <div className="rounded-full bg-[#1a4b8e]/90 p-3 mr-4 text-white shadow-md group-hover:scale-110 transition-transform">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Eligibility</p>
                        <p className="font-semibold text-gray-800 text-lg">
                          {event.eligibility}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors group">
                      <div className="rounded-full bg-[#1a4b8e]/90 p-3 mr-4 text-white shadow-md group-hover:scale-110 transition-transform">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">
                          Number of Rounds
                        </p>
                        <p className="font-semibold text-gray-800 text-lg">
                          {event.numberOfRounds}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* bashLong Description */}
            {event.longDescription && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="p-8">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-[#1a4b8e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    About This Event
                  </h2>
                  <div className="prose max-w-none text-gray-600 bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {event.longDescription}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Round Details */}
            {event.roundDetails && event.roundDetails.length > 0 && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="p-8">
                  <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-[#1a4b8e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Round Details
                  </h2>
                  <div className="space-y-4">
                    {event.roundDetails.map((round, index) => (
                      <div key={index} className="flex items-start p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                        <div className="rounded-full bg-[#1a4b8e] text-white h-8 w-8 flex items-center justify-center mr-4 shadow-md">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-gray-800 font-medium">{round.Type}</p>
                          {round.Description && (
                            <p className="text-gray-600 mt-1 text-sm">{round.Description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Contact Info */}
            {event.ContactInfo && event.ContactInfo.length > 0 && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="p-8">
                  <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-[#1a4b8e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Contact Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {event.ContactInfo.map((info, index) => (
                      <div key={index} className="flex items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all hover:scale-[1.02] hover:shadow-md">
                        <div className="rounded-full bg-[#1a4b8e] p-3 mr-4 text-white shadow-md">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                            />
                          </svg>
                        </div>
                        <p className="text-gray-700 font-medium">{info}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Apply Button */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="p-8">
                <div className="flex flex-col sm:flex-row justify-between items-center">
                  <div className="text-center sm:text-left mb-4 sm:mb-0">
                    <h3 className="text-lg font-bold text-[#1a4b8e] mb-1">Interested in this event?</h3>
                    <p className="text-gray-600">
                      Application deadline: <span className="font-semibold">{formatDate(event.registerationDeadline)}</span>
                    </p>
                  </div>
                  {(() => {
                    if (show === null) {
                      return (
                        <div className="flex items-center text-gray-500">
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#1a4b8e] mr-2"></div>
                          Loading...
                        </div>
                      );
                    } else if (show === 1) {
                      return (
                        <div className="w-full">
                          <div className="bg-green-100 text-green-800 px-4 py-3 rounded-md flex items-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium">Successfully Registered as Team Captain</span>
                          </div>
                          
                          {(detail.membersAccepted.length <
                            (detail.eventId.maxParticipants-1) && new Date(detail.eventId.registerationDeadline) > new Date()) && (
                            <div className="mt-6 p-6 border border-blue-100 rounded-xl bg-blue-50 shadow-md">
                              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-[#1a4b8e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                Add Team Member
                              </h3>
                              <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                  type="email"
                                  placeholder="Enter Member Email"
                                  value={memberEmail}
                                  onChange={(e) => setMemberEmail(e.target.value)}
                                  className="flex-grow px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-[#1a4b8e] focus:border-[#1a4b8e] transition-all"
                                />
                                <button 
                                  onClick={() => addMember()}
                                  className="bg-[#1a4b8e] hover:bg-[#153c70] text-white px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                                >
                                  <span className="flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Member
                                  </span>
                                </button>
                              </div>
                              <div className="flex items-center mt-3 text-sm text-blue-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                You can add up to {(detail.eventId.maxParticipants - 1) - detail.membersAccepted.length} more team members
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Round Status */}
                            <div className="bg-white border border-blue-100 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
                              <h3 className="font-bold text-lg text-[#1a4b8e] mb-4 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Round Progress
                              </h3>
                              <div className="space-y-4">
                                {detail.roundDetails && detail.roundDetails.map((round, i) => (
                                  <div key={i} className={`flex items-center p-3 rounded-lg transition-all ${round.selected ? "bg-green-50 border border-green-100" : "bg-gray-50 border border-gray-100"}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 shadow-md transition-colors
                                      ${round.selected ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                                      {i + 1}
                                    </div>
                                    <div className="flex justify-between w-full">
                                      <div>
                                        <p className="font-semibold">{round.Type || `Round ${i+1}`}</p>
                                      {round.selected && (
                                        <span className="text-green-600 text-sm flex items-center font-medium">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                          Cleared
                                        </span>
                                      )}
                                      {(round.roundDate || round.TestDate) && (
                                        <span className="text-gray-600 text-sm flex items-center mt-1">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                          {round.roundDate || round.TestDate}
                                        </span>
                                      
                                      )}
                                      {
                                        (round.SubmissionDeadline) && (
                                          <span className="text-blue-700 text-xs flex items-center mt-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {round.SubmissionDeadline}
                                          </span>
                                        )
                                      }
                                      </div>
                                      <div>
                                        {

                                          (round.GoogleFormLink && (new Date() < getDeadline(round.SubmissionDeadline))) && (
                                            <a
                                              href={round.GoogleFormLink}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center bg-[#1a4b8e] text-white px-1 py-2 w-[7vw] rounded-lg text-xs hover:bg-[#153c70] transition-colors shadow-sm hover:shadow"
                                            >
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                              </svg>
                                              Form Link
                                            </a>
                                          )
                                        }
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Team Details */}
                            <div className="bg-white border border-blue-100 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
                              <h3 className="font-bold text-lg text-[#1a4b8e] mb-4 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                Team Members
                              </h3>
                              {detail.membersAccepted && detail.membersAccepted.length > 0 ? (
                                <ul className="space-y-3">
                                  {detail.membersAccepted.map((member, i) => (
                                    <li key={i} className="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                      <div className="bg-[#1a4b8e] text-white rounded-full w-10 h-10 flex items-center justify-center mr-3 shadow-md">
                                        {member.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="font-semibold text-gray-800">{member.name}</p>
                                        <p className="text-sm text-gray-500">{member.email}</p>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-center py-8 px-4 bg-blue-50 rounded-lg">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-blue-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                  <p className="text-gray-600 font-medium">No team members added yet</p>
                                  <p className="text-sm text-gray-500 mt-1">Add team members to collaborate on this event</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    } else if (show === 2) {
                      return (
                        <div className="w-full">
                          <div className="bg-blue-100 text-blue-800 px-4 py-3 rounded-md flex items-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <div>
                              <span className="font-medium block">Team Member</span>
                              <span className="text-sm">Registered by {detail.studentId.name}</span>
                            </div>
                          </div>
                          
                          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Round Status */}
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <h3 className="font-medium text-lg text-gray-800 mb-3 border-b pb-2">Round Progress</h3>
                              <div className="space-y-2">
                                {detail.roundDetails && detail.roundDetails.map((round, i) => (
                                  <div key={i} className="flex items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 
                                      ${round.selected ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                                      {i + 1}
                                    </div>
                                    <div>
                                      <p className="font-medium">{round.Type || `Round ${i+1}`}</p>
                                      {round.selected && (
                                        <span className="text-green-600 text-sm flex items-center">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                          Cleared
                                        </span>
                                      )}
                                      {(round.roundDate || round.TestDate) && (
                                        <span className="text-gray-500 text-sm">
                                          {round.roundDate || round.TestDate}
                                        </span>
                                      )}
                                       {
                                        (round.SubmissionDeadline) && (
                                          <span className="text-blue-700 text-xs flex items-center mt-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {round.SubmissionDeadline}
                                          </span>
                                        )
                                      }
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Team Details */}
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <h3 className="font-medium text-lg text-gray-800 mb-3 border-b pb-2">Team Members</h3>
                              {detail.membersAccepted && detail.membersAccepted.length > 0 ? (
                                <ul className="space-y-2">
                                  {detail.membersAccepted.map((member, i) => (
                                    <li key={i} className="flex items-center">
                                      <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mr-2">
                                        {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                      </div>
                                      <div>
                                        <p className="font-medium">{member.name}</p>
                                        <p className="text-xs text-gray-500">{member.email}</p>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-center py-4 text-gray-500">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                  <p>No other team members yet</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    } else if (show === 3) {
                      if(new Date(detail[0].eventId.registerationDeadline) > new Date()){
                        return (
                          <div className="w-full">
                            <div className="bg-yellow-100 text-yellow-800 px-4 py-3 rounded-md mb-4">
                              <h3 className="font-medium text-lg mb-2">Team Invitations</h3>
                              <p className="text-sm">You've been invited to join teams for this event</p>
                            </div>
                            
                            <div className="space-y-4">
                              {Array.isArray(detail) && detail.map((offer, i) => (
                                <div key={i} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                                  <div className="flex items-center mb-3">
                                    <div className="bg-blue-100 text-blue-800 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                                      {offer.studentId.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-medium">Team Captain: {offer.studentId.name}</p>
                                      <p className="text-xs text-gray-500">{offer.studentId.email}</p>
                                    </div>
                                  </div>
                                  
                                  {/* Team members if available */}
                                  {offer.membersAccepted && offer.membersAccepted.length > 0 && (
                                    <div className="mb-3 pl-3 border-l-2 border-gray-200">
                                      <p className="text-sm text-gray-600 mb-1">Current team members:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {offer.membersAccepted.map((member, idx) => (
                                          <span key={idx} className="inline-flex items-center bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                                            {member.name}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                                    <button 
                                      onClick={() => acceptMemberOffer(offer.studentId._id)}
                                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex-1"
                                    >
                                      Accept Invitation
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                              <h3 className="font-medium text-gray-800 mb-2">Not interested in joining a team?</h3>
                              <p className="text-sm text-gray-600 mb-3">You can register your own team instead</p>
                              <button 
                                onClick={handleRegister} 
                                className="w-full bg-[#1a4b8e] hover:bg-[#153c70] text-white px-4 py-2 rounded-md"
                              >
                                Register as Team Captain
                              </button>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="w-full">
                            <div className="bg-orange-100 text-orange-800 px-4 py-3 rounded-md flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <span className="font-medium">Registration deadline has passed</span>
                            </div>
                          </div>
                        );
                      }
                      
                    } else {
                      if (
                        new Date(detail?.registerationDeadline) > new Date()
                      ) {
                        return (
                          <button 
                            onClick={handleRegister}
                            className="bg-[#1a4b8e] hover:bg-[#153c70] text-white px-8 py-3 rounded-lg font-medium transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="text-lg">Register Now</span>
                          </button>
                        );
                      } else {
                        return (
                          <div className="bg-orange-100 text-orange-800 px-6 py-4 rounded-lg shadow-md flex items-center border border-orange-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                              <span className="font-semibold text-lg block">Registration Closed</span>
                              <span className="text-sm text-orange-700">The deadline for this event has passed</span>
                            </div>
                          </div>
                        );
                      }
                    }
                  })()}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-xl p-10 text-center border border-gray-100">
            <div className="bg-red-50 w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Event Not Found
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              We couldn't locate the event you're looking for. It might have been removed, rescheduled, or the ID is invalid.
            </p>
            <div className="mt-6">
              <Link
                to="/events"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-md text-white bg-[#1a4b8e] hover:bg-[#153c70] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a4b8e] transition-all transform hover:-translate-y-0.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Browse All Events
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Event;
