import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'

const Club = () => {
    const [clubDetails, setClubDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const { clubId } = useParams();

    async function fetchClubDetails() {
        try {
            const response = await axios.get(
                `${import.meta.env.VITE_BASE_URI}/admin/getClubDetail`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("adminToken")}`
                    },
                    params: {
                        clubId
                    }
                }
            );

            if (response.data.success) {
                setClubDetails(response.data.club);
            } else {
                toast.error(response.data.msg);
            }
        } catch (error) {
            console.error("Error fetching club details:", error);
            toast.error("Failed to load club details");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchClubDetails();
    }, [clubId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1a4b8e]"></div>
            </div>
        );
    }

    if (!clubDetails) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <h1 className="text-2xl font-bold text-red-500">Club Not Found</h1>
                <p className="text-gray-600 mt-2">The requested club could not be found.</p>
                <Link to="/clubs" className="mt-4 bg-[#1a4b8e] text-white px-4 py-2 rounded-lg hover:bg-[#143b72] transition-colors">
                    Back to Clubs
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Back Button */}
                <div className="mb-6">
                    <Link 
                        to="/clubs" 
                        className="inline-flex items-center text-[#1a4b8e] font-medium hover:underline"
                    >
                        <svg className="h-5 w-5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Back to Clubs
                    </Link>
                </div>

                {/* Header */}
                <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                    <div className="bg-[#1a4b8e] px-6 py-4">
                        <h1 className="text-2xl font-bold text-white">{clubDetails.name}</h1>
                    </div>
                    
                    {/* Basic Information */}
                    <div className="p-6">
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                                <h3 className="text-gray-500 font-medium mb-2">Basic Information</h3>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="mb-3">
                                        <p className="text-sm font-medium text-gray-500">Club Name</p>
                                        <p className="text-gray-900">{clubDetails.name}</p>
                                    </div>
                                    <div className="mb-3">
                                        <p className="text-sm font-medium text-gray-500">Username</p>
                                        <p className="text-gray-900">{clubDetails.userName}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Club ID</p>
                                        <p className="text-gray-700 text-sm break-all">{clubDetails._id}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {clubDetails.shortDescription && (
                                <div>
                                    <h3 className="text-gray-500 font-medium mb-2">Description</h3>
                                    <div className="bg-gray-50 rounded-lg p-4 h-full">
                                        <p className="text-gray-700">{clubDetails.shortDescription}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Contact Information */}
                {(clubDetails.contactEmail || clubDetails.contactPhone) && (
                    <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                        <div className="p-6">
                            <h3 className="text-gray-800 font-medium text-lg mb-4">Contact Information</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {clubDetails.contactEmail && (
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm font-medium text-gray-500 mb-1">Email</p>
                                        <div className="flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#1a4b8e]" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                            </svg>
                                            <a href={`mailto:${clubDetails.contactEmail}`} className="text-[#1a4b8e] hover:underline">
                                                {clubDetails.contactEmail}
                                            </a>
                                        </div>
                                    </div>
                                )}
                                
                                {clubDetails.contactPhone && (
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm font-medium text-gray-500 mb-1">Phone</p>
                                        <div className="flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#1a4b8e]" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                            </svg>
                                            <a href={`tel:${clubDetails.contactPhone}`} className="text-[#1a4b8e] hover:underline">
                                                {clubDetails.contactPhone}
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Social Media & Web Links */}
                {(clubDetails.website || clubDetails.linkedin || clubDetails.instagram) && (
                    <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                        <div className="p-6">
                            <h3 className="text-gray-800 font-medium text-lg mb-4">Social Media & Web</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {clubDetails.website && (
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm font-medium text-gray-500 mb-1">Website</p>
                                        <a href={clubDetails.website} target="_blank" rel="noopener noreferrer" className="text-[#1a4b8e] hover:underline flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                                            </svg>
                                            Visit Website
                                        </a>
                                    </div>
                                )}
                                
                                {clubDetails.linkedin && (
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm font-medium text-gray-500 mb-1">LinkedIn</p>
                                        <a href={clubDetails.linkedin} target="_blank" rel="noopener noreferrer" className="text-[#1a4b8e] hover:underline flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                            </svg>
                                            LinkedIn Profile
                                        </a>
                                    </div>
                                )}
                                
                                {clubDetails.instagram && (
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm font-medium text-gray-500 mb-1">Instagram</p>
                                        <a href={clubDetails.instagram} target="_blank" rel="noopener noreferrer" className="text-[#1a4b8e] hover:underline flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                            </svg>
                                            Instagram Profile
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Long Description */}
                {clubDetails.longDescription && (
                    <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                        <div className="p-6">
                            <h3 className="text-gray-800 font-medium text-lg mb-4">Detailed Description</h3>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-gray-700 whitespace-pre-wrap">{clubDetails.longDescription}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Achievements */}
                {clubDetails.achivements && (
                    <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                        <div className="p-6">
                            <h3 className="text-gray-800 font-medium text-lg mb-4">Achievements</h3>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-gray-700 whitespace-pre-wrap">{clubDetails.achivements}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recruitment Methods */}
                {clubDetails.recruitmentMethods && (
                    <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                        <div className="p-6">
                            <h3 className="text-gray-800 font-medium text-lg mb-4">Recruitment Methods</h3>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-gray-700 whitespace-pre-wrap">{clubDetails.recruitmentMethods}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end mt-6">
                    <Link
                        to="/clubs"
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors mr-2"
                    >
                        Back to Clubs
                    </Link>
                   
                </div>
            </div>
        </div>
    )
}

export default Club