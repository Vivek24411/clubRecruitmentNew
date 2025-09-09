import React from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom';

const Event = () => {

  const { eventId } = useParams()
  const [event, setEvent] = React.useState(null)
  const [isLoading, setIsLoading] = React.useState(true)

  async function fetchEventDetails(){
    setIsLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/admin/getEventDetail`,{
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`
        },
        params: {
          eventId
        }
      });

      console.log(response);
      
      if(response.data.success){
        setEvent(response.data.event);
      }else{
        toast.error(response.data.msg);
      }
    } catch (error) {
      console.error("Error fetching event details:", error);
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    fetchEventDetails();
  }, [eventId]);  

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back button */}
        <div className="mb-6">
          <a 
            href="/admin/events" 
            className="inline-flex items-center text-[#1a4b8e] hover:text-[#153c70] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Events
          </a>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1a4b8e]"></div>
          </div>
        ) : event ? (
          <>
            {/* Event Header */}
            <div className="bg-[#1a4b8e] rounded-lg shadow-lg overflow-hidden mb-6">
              <div className="px-6 py-8">
                <h1 className="text-2xl md:text-3xl font-bold text-white">{event.title}</h1>
                {event.shortDescription && (
                  <p className="mt-2 text-blue-100 text-lg">{event.shortDescription}</p>
                )}
              </div>
            </div>

            {/* Event Details */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Event Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-4">
                      <p className="text-sm text-gray-500">Registration Deadline</p>
                      <p className="font-medium text-gray-800">{event.registerationDeadline}</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm text-gray-500">Max Participants</p>
                      <p className="font-medium text-gray-800">{event.maxParticipants}</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm text-gray-500">Eligibility</p>
                      <p className="font-medium text-gray-800">{event.eligibility}</p>
                    </div>
                  </div>
                  <div>
                    <div className="mb-4">
                      <p className="text-sm text-gray-500">Number of Rounds</p>
                      <p className="font-medium text-gray-800">{event.numberOfRounds}</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm text-gray-500">Created At</p>
                      <p className="font-medium text-gray-800">{event.createdAt ? new Date(event.createdAt).toLocaleString() : '-'}</p>
                    </div>
                  </div>
                </div>
                {event.longDescription && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Long Description</h3>
                    <div className="prose max-w-none text-gray-600">
                      <p className="whitespace-pre-wrap">{event.longDescription}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Info */}
            {event.ContactInfo && event.ContactInfo.length > 0 && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Contact Information</h2>
                  <ul className="list-disc pl-6 text-gray-700">
                    {event.ContactInfo.map((info, idx) => (
                      <li key={idx}>{info}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Round Details */}
            {event.roundDetails && event.roundDetails.length > 0 && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Round Details</h2>
                  <ul className="list-disc pl-6 text-gray-700">
                    {event.roundDetails.map((round, idx) => (
                     
                      <div>
                       <h3>Round - {round.Round} {round.Type}</h3>
                       
                      </div>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Event not found</h3>
            <p className="mt-1 text-sm text-gray-500">This event might have been removed or the ID is invalid.</p>
            <div className="mt-6">
              <a
                href="/admin/events"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#1a4b8e] hover:bg-[#153c70] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a4b8e]"
              >
                Go back to Events
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Event