import React from 'react'
import axios from 'axios';
import { toast } from 'react-toastify';

const AddSession = () => {
  const [title, setTitle] = React.useState("");
  const [shortDescription, setShortDescription] = React.useState("");
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [duration, setDuration] = React.useState("");
  const [longDescription, setLongDescription] = React.useState("");
  const [venue, setVenue] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e) => { 
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/addSession`, {
        title,
        shortDescription,
        date,
        time,
        duration,
        longDescription,
        venue
      },{
        headers: {
          Authorization: `Bearer ${localStorage.getItem("clubToken")}`
        }
      });

      if(response.data.success){
        toast.success(response.data.msg);
        // Reset form after successful submission
        setTitle("");
        setShortDescription("");
        setDate("");
        setTime("");
        setDuration("");
        setLongDescription("");
        setVenue("");
      }else{
        toast.error(response.data.msg);
      }
    } catch (error) {
      console.error("Error adding session:", error);
      toast.error(error.response?.data?.msg || "Failed to create session");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Create New Session</h1>
          <p className="mt-2 text-gray-600">Schedule a new recruitment or information session for students</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          {/* Form Header */}
          <div className="bg-[#1a4b8e] px-6 py-4">
            <h2 className="text-xl font-medium text-white">Session Details</h2>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              {/* Title */}
              <div className="sm:col-span-6">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Session Title
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Enter a descriptive title for your session"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#1a4b8e] focus:border-[#1a4b8e] sm:text-sm border px-3 py-2"
                  />
                </div>
              </div>

              {/* Short Description */}
              <div className="sm:col-span-6">
                <label htmlFor="shortDescription" className="block text-sm font-medium text-gray-700">
                  Short Description
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="shortDescription"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    required
                    placeholder="Brief description (will appear in listings)"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#1a4b8e] focus:border-[#1a4b8e] sm:text-sm border px-3 py-2"
                  />
                </div>
              </div>

              {/* Date and Time - side by side on larger screens */}
              <div className="sm:col-span-3">
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    placeholder='YYYY-MM-DD'
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#1a4b8e] focus:border-[#1a4b8e] sm:text-sm border px-3 py-2"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="time" className="block text-sm font-medium text-gray-700">
                  Start Time
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    placeholder='HH:MM'
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#1a4b8e] focus:border-[#1a4b8e] sm:text-sm border px-3 py-2"
                  />
                </div>
              </div>

              {/* Duration and Venue - side by side on larger screens */}
              <div className="sm:col-span-3">
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                  Duration (minutes)
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    required
                    placeholder="e.g. 60"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#1a4b8e] focus:border-[#1a4b8e] sm:text-sm border px-3 py-2"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="venue" className="block text-sm font-medium text-gray-700">
                  Venue
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="venue"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    required
                    placeholder="Location of the session"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#1a4b8e] focus:border-[#1a4b8e] sm:text-sm border px-3 py-2"
                  />
                </div>
              </div>

              {/* Detailed Description */}
              <div className="sm:col-span-6">
                <label htmlFor="longDescription" className="block text-sm font-medium text-gray-700">
                  Detailed Description
                </label>
                <div className="mt-1">
                  <textarea
                    id="longDescription"
                    value={longDescription}
                    onChange={(e) => setLongDescription(e.target.value)}
                    required
                    rows={5}
                    placeholder="Provide detailed information about this session"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#1a4b8e] focus:border-[#1a4b8e] sm:text-sm border px-3 py-2"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Include any special instructions, requirements, or what attendees should expect
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto flex justify-center py-3 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-[#1a4b8e] hover:bg-[#15407a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a4b8e] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Session...
                  </span>
                ) : (
                  "Create Session"
                )}
              </button>
            </div>
          </form>

          {/* Information Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-[#1a4b8e]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">
                  Sessions will be visible to all students after creation. Make sure all information is accurate.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddSession