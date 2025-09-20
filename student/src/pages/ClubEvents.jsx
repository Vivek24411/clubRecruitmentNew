import React from 'react'
import {useParams, Link} from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify';
import { useEffect } from 'react';

const ClubEvents = () => {

    const [clubEvents, setClubEvents] = React.useState([])
    const [isLoading, setIsLoading] = React.useState(true)
    const { clubId } = useParams();

    async function fetchClubEvents(){
        setIsLoading(true);
        try {
          const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/student/getClubEvents`,{
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`
            },
            params: { clubId }
          });
          if(response.data.success){
            setClubEvents(response.data.events);
          }else{
            toast.error(response.data.msg);
          }
        } catch (error) {
         
          toast.error("Failed to fetch club events");
        } finally {
          setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchClubEvents();
    }, [clubId]);

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Back button */}
                <div className="mb-6">
                    <Link 
                        to={`/club/${clubId}`} 
                        className="inline-flex items-center text-[#1a4b8e] hover:text-[#153c70] transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Back to Club Profile
                    </Link>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-6">Club Events</h1>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1a4b8e]"></div>
                    </div>
                ) : clubEvents && clubEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {clubEvents.map(event => (
                            <div key={event._id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden flex flex-col">
                                <div className="bg-[#1a4b8e] px-6 py-4">
                                    <h2 className="text-xl font-semibold text-white">{event.title}</h2>
                                    {event.shortDescription && (
                                        <p className="mt-1 text-blue-100 text-sm">{event.shortDescription}</p>
                                    )}
                                </div>
                                <div className="p-5 flex-1 flex flex-col justify-between">
                                    <div className="space-y-3">
                                        <div className="flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-gray-700 text-sm">Deadline: <span className="font-medium">{event.registerationDeadline}</span></span>
                                        </div>
                                        
                                        <div className="flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <span className="text-gray-700 text-sm">Max Participants: <span className="font-medium">{event.maxParticipants}</span></span>
                                        </div>
                                        
                                        <div className="flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                            </svg>
                                            <span className="text-gray-700 text-sm">Eligibility: <span className="font-medium">{event.eligibility}</span></span>
                                        </div>

                                        <div className="flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                            <span className="text-gray-700 text-sm">Rounds: <span className="font-medium">{event.numberOfRounds}</span></span>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <Link
                                            to={`/event/${event._id}`}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#1a4b8e] hover:bg-[#153c70] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a4b8e]"
                                        >
                                            View Details
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-md p-6 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No events found</h3>
                        <p className="mt-1 text-sm text-gray-500">This club doesn't have any active events at the moment.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ClubEvents