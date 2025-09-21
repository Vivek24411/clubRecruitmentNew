import React from 'react'
import axios from 'axios'
import { useParams } from 'react-router-dom'
import {toast} from 'react-toastify'


const EventRegisteredStudents = () => {

    const { eventId } = useParams();
    const [registeredStudents, setRegisteredStudents] = React.useState([]);
    const [interviewDate, setInterviewDate] = React.useState("");
    const [eventDetails, setEventDetails] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("all");
    
    async function fetchEventDetails() {
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/club/getEvent`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("clubToken")}`
                },params: {
                    eventId
                }
            });
            
            if (response.data.success) {
                setEventDetails(response.data.event);
            } else {
                toast.error("Failed to load event details");
            }
        } catch (error) {
            console.error("Error fetching event details:", error);
        }
    }
    
    async function fetchRegisteredStudents() {  
        setIsLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URI}/club/getEventsRegisteredStudents`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("clubToken")}`
                },
                params: {
                    eventId
                }
            });

            console.log(response);
            
            
            if (response.data.success) {
                setRegisteredStudents(response.data.registeredStudents);
            } else {
                toast.error(response.data.msg);
            }
        } catch (error) {
            console.error("Error fetching registered students:", error);
            toast.error("Failed to load registered students");
        } finally {
            setIsLoading(false);
        }
    }

    async function finalizeStudent(studentId){
        try {
            const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/finalizeStudent`, {
                eventId,
                studentId
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("clubToken")}`
                }
            });

            console.log(response);
            

            if (response.data.success) {
                toast.success("Student finalized successfully");
                fetchRegisteredStudents();
            }else{
                toast.error(response.data.msg);
            }
        } catch (error) {
            console.error("Error finalizing student:", error);
        }

    }

    async function scheduleInterview(studentId,roundNumber){
        try {
            const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/scheduleInterview`, {
                eventId,
                studentId,
                roundNumber,
                roundDate: interviewDate
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("clubToken")}`
                }
            });

            console.log(response);
            

            if (response.data.success) {
                toast.success("Interview scheduled successfully");
                fetchRegisteredStudents();
            }else{
                toast.error(response.data.msg);
            }
        } catch (error) {
            console.error("Error scheduling interview:", error);
        }   
    }

    async function selectStudentForRound(studentId, roundNumber){
        try {
            const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/selectStudentForRound`, {
                eventId,
                studentId,
                roundNumber
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("clubToken")}`
                }
            });

            console.log(response);
            

            if (response.data.success) {
                toast.success("Student selected for round successfully");
                fetchRegisteredStudents();
            }else{
                toast.error(response.data.msg);
            }
        } catch (error) {
            console.error("Error selecting student for round:", error);
        }
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    // Filter students based on search query and status filter
    const filteredStudents = React.useMemo(() => {
        if (!registeredStudents.length) return [];

        return registeredStudents.filter(student => {
            // Search query matching
            const query = searchQuery.toLowerCase().trim();
            if (query) {
                const studentInfo = student.studentId;
                const matchesName = studentInfo.name?.toLowerCase().includes(query);
                const matchesEmail = studentInfo.email?.toLowerCase().includes(query);
                const matchesBranch = studentInfo.branch?.toLowerCase().includes(query);
                const matchesYear = studentInfo.year?.toString().includes(query);
                
                if (!(matchesName || matchesEmail || matchesBranch || matchesYear)) {
                    return false;
                }
            }
            
            // Status filtering
            if (statusFilter !== "all") {
                const lastRound = student.roundDetails[student.numberOfRounds - 1];
                
                switch(statusFilter) {
                    case "finalized":
                        return (lastRound.roundDate || lastRound.TestDate) && lastRound.selected;
                    case "pending-final":
                        return (lastRound.roundDate || lastRound.TestDate) && !lastRound.selected;
                    case "in-progress":
                        // Check if any round is complete but not the final round
                        for (let i = 0; i < student.numberOfRounds - 1; i++) {
                            const round = student.roundDetails[i];
                            if (round.roundDate || round.TestDate) {
                                return true;
                            }
                        }
                        return false;
                    case "not-started":
                        // First round not scheduled yet
                        return !student.roundDetails[0].roundDate && !student.roundDetails[0].TestDate;
                    default:
                        return true;
                }
            }
            
            return true;
        });
    }, [registeredStudents, searchQuery, statusFilter]);

    React.useEffect(() => {
        fetchEventDetails();
        fetchRegisteredStudents();
    }, [eventId]);

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Event Header */}
            {eventDetails && (
                <div className="mb-8">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-800 rounded-lg shadow-lg p-6">
                        <div className="md:flex md:justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-white">{eventDetails.title}</h1>
                                <p className="text-indigo-100 mt-1">{eventDetails.shortDescription}</p>
                            </div>
                            <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
                                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
                                    <div className="font-semibold">Deadline</div>
                                    <div>{formatDate(eventDetails.registerationDeadline)}</div>
                                </div>
                                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
                                    <div className="font-semibold">Rounds</div>
                                    <div>{eventDetails.numberOfRounds}</div>
                                </div>
                                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
                                    <div className="font-semibold">Eligibility</div>
                                    <div>{eventDetails.eligibility}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Student count and filters */}
            <div className="mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 mb-3 md:mb-0">
                        Registered Students 
                        <span className="ml-2 text-sm font-normal bg-indigo-100 text-indigo-800 py-1 px-2 rounded-full">
                            {registeredStudents.length} {registeredStudents.length === 1 ? 'student' : 'students'}
                        </span>
                    </h2>
                    
                    <button 
                        onClick={fetchRegisteredStudents}
                        className="text-indigo-600 hover:text-indigo-800 flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>
                
                {/* Search and filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search input */}
                    <div className="md:col-span-2">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search by name, email, branch..."
                                className="pl-10 w-full border-gray-300 rounded-md py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm border"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {/* Status filter */}
                    <div className="md:col-span-2">
                        <select
                            className="w-full border-gray-300 rounded-md py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm border"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Students</option>
                            <option value="finalized">Finalized</option>
                            <option value="pending-final">Pending Final Selection</option>
                            <option value="in-progress">In Progress</option>
                            <option value="not-started">Not Started</option>
                        </select>
                    </div>
                </div>
                
                {/* Results summary */}
                <div className="mt-4 text-sm text-gray-600">
                    {searchQuery || statusFilter !== "all" ? (
                        <p>
                            Showing {filteredStudents.length} of {registeredStudents.length} students
                            {searchQuery && <span> matching "{searchQuery}"</span>}
                            {statusFilter !== "all" && <span> with status: {statusFilter.replace("-", " ")}</span>}
                            {filteredStudents.length === 0 && 
                                <button 
                                    className="ml-2 text-indigo-600 hover:text-indigo-800"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setStatusFilter("all");
                                    }}
                                >
                                    Clear filters
                                </button>
                            }
                        </p>
                    ) : null}
                </div>
            </div>
            
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            ) : registeredStudents.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <div className="flex justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-gray-700">No registered students yet</h2>
                    <p className="mt-2 text-gray-500">No students have registered for this event so far.</p>
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <div className="flex justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-gray-700">No matching students</h2>
                    <p className="mt-2 text-gray-500">Try adjusting your search or filter criteria.</p>
                    <button 
                        className="mt-4 text-indigo-600 hover:text-indigo-800 flex items-center mx-auto"
                        onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("all");
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Clear filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:gap-8">
                    {filteredStudents.map(student => (
                    <div key={student._id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                        {/* Student header with info */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-white">{student.studentId.name}</h2>
                                <div className="mt-1 flex items-center">
                                    <span className="bg-blue-400/30 text-white text-xs px-2 py-0.5 rounded-full">Captain</span>
                                </div>
                                <div className="mt-1.5 space-y-1 text-sm text-white/90">
                                    <p>{student.studentId.branch} • Year {student.studentId.year}</p>
                                    <p>{student.studentId.enrollmentNumber}</p>
                                </div>
                                <div className="mt-2 flex items-center space-x-3">
                                    <a href={`mailto:${student.studentId.email}`} className="flex items-center text-white/80 hover:text-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span>{student.studentId.email}</span>
                                    </a>
                                    <a href={`tel:${student.studentId.phoneNumber}`} className="flex items-center text-white/80 hover:text-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        <span>{student.studentId.phoneNumber}</span>
                                    </a>
                                </div>
                            </div>
                            
                            {student.membersAccepted && student.membersAccepted.length > 0 && (
                                <div className="bg-blue-700/50 rounded-lg p-3">
                                    <h3 className="text-sm font-medium text-white border-b border-white/20 pb-1 mb-2">Team Members</h3>
                                    <div className="space-y-3">
                                        {student.membersAccepted.map((member, index) => (
                                            <div key={member.id || index} className="flex items-start space-x-2">
                                                <div className="h-6 w-6 rounded-full bg-blue-500/40 flex items-center justify-center text-xs text-white flex-shrink-0">
                                                    {index + 1}
                                                </div>
                                                <div className="text-sm text-white">
                                                    <p className="font-medium">{member.name}</p>
                                                    <div className="text-xs text-white/80 space-y-0.5">
                                                        <p>{member.email}</p>
                                                        <p>{member.phoneNumber}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Student details */}
                        <div className="p-6">
                            {/* Registration info */}
                            <div className="flex flex-wrap justify-between items-center mb-4 text-sm text-gray-600">
                                <p>Registered: {formatDate(student.registeredAt)}</p>
                                {/* <p>Contact: {student.ContactInfo?.join(', ')}</p> */}
                            </div>
                            
                            {/* Round status cards */}
                            <div className="mt-4 space-y-4">
                                {/* Use IIFE to handle conditional rendering with early returns */}
                                {(() => {
                                    const lastRound = student.roundDetails[student.numberOfRounds - 1];
                                    
                                    // Check if student is finalized
                                    if ((lastRound.roundDate || lastRound.TestDate || lastRound.SubmissionDeadline) && lastRound.selected) {
                                        return (
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                    <div className="ml-4">
                                                        <h3 className="text-lg font-semibold text-green-800">Finalized</h3>
                                                        <p className="text-green-700 mt-1">{lastRound.remarks || "Student has completed all rounds successfully"}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    
                                    // Check if student needs to be finalized
                                    if ((lastRound.roundDate || lastRound.TestDate || lastRound.SubmissionDeadline) && !lastRound.selected) {
                                        return (
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                                                <h3 className="text-lg font-semibold text-blue-800 mb-3">Round {student.numberOfRounds}</h3>
                                               
                                                <button 
                                                    onClick={() => finalizeStudent(student.studentId._id)}
                                                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                                                >
                                                    Finalize Selection
                                                </button>
                                            </div>
                                        );
                                    }
                            
                                    // Check previous rounds
                                    for (let i = student.numberOfRounds - 2; i >= 0; i--) {
                                        const round = student.roundDetails[i];
                                        
                                        if (round.selected && (round.roundDate || round.TestDate || round.SubmissionDeadline)) {
                                            return (
                                                <div key={`round-${i}`} className="bg-indigo-50 border border-indigo-200 rounded-lg p-5">
                                                    <h3 className="text-lg font-semibold text-indigo-800 mb-2">Round {i + 1} Complete</h3>
                                                    <div className="flex items-center mb-3">
                                                        <span className="bg-indigo-100 text-indigo-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">
                                                            {round.Type}
                                                        </span>
                                                        <span className="text-gray-600 text-sm">
                                                            {round.roundDate || round.TestDate}
                                                        </span>
                                                    </div>
                                                    {round.remarks && <p className="text-gray-700 mb-3">{round.remarks}</p>}
                                                    
                                                    <div className="mt-4 bg-white p-4 rounded-md border border-gray-200">
                                                        <h4 className="font-medium text-gray-700 mb-2">Schedule Next Round</h4>
                                                        <div className="flex flex-col md:flex-row gap-3">
                                                            <input 
                                                                type="text" 
                                                                value={interviewDate} 
                                                                onChange={(e) => setInterviewDate(e.target.value)}
                                                                className="flex-grow border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                                                                placeholder="YYYY-MM-DD HH:MM"
                                                            />
                                                            <button 
                                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                                                                onClick={() => scheduleInterview(student.studentId._id, i + 2)}
                                                            >
                                                                Schedule Round {i + 2}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        } else if (!round.selected && (round.roundDate || round.TestDate || round.SubmissionDeadline)) {
                                            return (
                                                <div key={`select-${i}`} className="bg-amber-50 border border-amber-200 rounded-lg p-5">
                                                    <h3 className="text-lg font-semibold text-amber-800 mb-2">Round {i + 1} Evaluation</h3>
                                                    <div className="flex items-center mb-3">
                                                        <span className="bg-amber-100 text-amber-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">
                                                            {round.Type}
                                                        </span>
                                                        <span className="text-gray-600 text-sm">
                                                            {round.roundDate || round.TestDate}
                                                        </span>
                                                    </div>
                                                   
                                                    <button 
                                                        className="w-full md:w-auto bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                                                        onClick={() => selectStudentForRound(student.studentId._id, i + 1)}
                                                    >
                                                        Select for Next Round
                                                    </button>
                                                </div>
                                            );
                                        }
                                    }
                                    
                                    // First round handling (only if no other conditions were met)
                                    if (student.roundDetails && student.roundDetails[0] && 
                                    (!student.roundDetails[0].roundDate && !student.roundDetails[0].TestDate)) {
                                        return (
                                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                                                <h3 className="text-lg font-semibold text-gray-800 mb-3">Schedule First Round</h3>
                                                <p className="text-gray-700 mb-3">
                                                    This student has registered but hasn't been scheduled for the first round yet.
                                                </p>
                                                <div className="mt-4 bg-white p-4 rounded-md border border-gray-200">
                                                    <div className="flex flex-col md:flex-row gap-3">
                                                        <input 
                                                            type="text" 
                                                            value={interviewDate} 
                                                            onChange={(e) => setInterviewDate(e.target.value)}
                                                            className="flex-grow border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                                            placeholder="YYYY-MM-DD HH:MM"
                                                        />
                                                        <button 
                                                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                                                            onClick={() => scheduleInterview(student.studentId._id, 1)}
                                                        >
                                                            Schedule Round 1
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    
                                    // If no conditions were met, return nothing
                                    return null;
                                })()}
                            </div>
                        </div>
                    </div>
                    ))}
                </div>
            )}
            
            {/* Footer/Actions Area */}
            <div className="mt-8 flex justify-center">
                <button
                    onClick={() => window.history.back()}
                    className="flex items-center text-gray-600 hover:text-gray-800"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Events
                </button>
            </div>
        </div>
    )
}

export default EventRegisteredStudents