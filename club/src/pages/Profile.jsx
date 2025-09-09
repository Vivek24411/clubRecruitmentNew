import React, { useEffect, useState, useContext } from 'react'
import { ClubContextData } from '../context/ClubContext.jsx'
import axios from 'axios'
import { toast } from 'react-toastify'

const Profile = () => {
  const {clubProfile, setClubProfile} = useContext(ClubContextData);
  const [isLoading, setIsLoading] = useState(!clubProfile);
  const [updateProfileTab, setUpdateProfileTab] = useState(false);

  // Form States
  const [name, setName] = useState(clubProfile ? clubProfile.name : '');
  const [userName, setUserName] = useState(clubProfile ? clubProfile.userName : '');
  const [shortDescription, setShortDescription] = useState(clubProfile ? clubProfile.shortDescription : '');
  const [longDescription, setLongDescription] = useState(clubProfile ? clubProfile.longDescription : '');
  const [website, setWebsite] = useState(clubProfile ? clubProfile.website : '');
  const [linkedin, setLinkedin] = useState(clubProfile ? clubProfile.linkedin : '');
  const [instagram, setInstagram] = useState(clubProfile ? clubProfile.instagram : '');
  const [achivements, setAchivements] = useState(clubProfile ? clubProfile.achivements : '');
  const [recruitmentMethods, setRecruitmentMethods] = useState(clubProfile ? clubProfile.recruitmentMethods : '');
  const [contactEmail, setContactEmail] = useState(clubProfile ? clubProfile.contactEmail : '');
  const [contactPhone, setContactPhone] = useState(clubProfile ? clubProfile.contactPhone : '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form state when clubProfile changes
  useEffect(() => {
    if (clubProfile) {
      setName(clubProfile.name || '');
      setUserName(clubProfile.userName || '');
      setShortDescription(clubProfile.shortDescription || '');
      setLongDescription(clubProfile.longDescription || '');
      setWebsite(clubProfile.website || '');
      setLinkedin(clubProfile.linkedin || '');
      setInstagram(clubProfile.instagram || '');
      setAchivements(clubProfile.achivements || '');
      setRecruitmentMethods(clubProfile.recruitmentMethods || '');
      setContactEmail(clubProfile.contactEmail || '');
      setContactPhone(clubProfile.contactPhone || '');
      setIsLoading(false);
    }
  }, [clubProfile]);

  async function updateProfile(e){

    e.preventDefault();
    console.log('hiii');
    
    setIsSubmitting(true);

    console.log('hiii');
    
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/updateProfile`,{
        name, userName, shortDescription, longDescription, website, linkedin, instagram, achivements, recruitmentMethods, contactEmail, contactPhone
      },{
        headers: {
          Authorization: `Bearer ${localStorage.getItem("clubToken")}`,
        },
      });

      console.log(response);
      

      if (response.data.success) {
        setClubProfile(response.data.club);
        setUpdateProfileTab(false);
        toast.success("Profile updated successfully");
      } else {
        toast.error(response.data.msg || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("An error occurred while updating profile");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1a4b8e]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Club Profile</h1>
          <p className="text-gray-600 mt-2">View and manage your club information</p>
        </div>

        {!updateProfileTab ? (
          /* View Profile Mode */
          <div>
            {/* Club Header */}
            <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
              <div className="bg-[#1a4b8e] px-6 py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <h2 className="text-xl font-bold text-white">{clubProfile.name}</h2>
                  <button
                    onClick={() => setUpdateProfileTab(true)}
                    className="mt-2 md:mt-0 bg-white text-[#1a4b8e] px-4 py-1 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                  >
                    Edit Profile
                  </button>
                </div>
                {clubProfile.shortDescription && (
                  <p className="mt-2 text-blue-100">{clubProfile.shortDescription}</p>
                )}
              </div>

              {/* Basic Info */}
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Club Name</p>
                    <p className="mt-1 text-gray-900">{clubProfile.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Username</p>
                    <p className="mt-1 text-gray-900">{clubProfile.userName}</p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              {(clubProfile.contactEmail || clubProfile.contactPhone) && (
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {clubProfile.contactEmail && (
                      <div className="flex items-center">
                        <div className="rounded-full bg-gray-100 p-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e]" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-500">Email</p>
                          <a href={`mailto:${clubProfile.contactEmail}`} className="text-[#1a4b8e] hover:underline">{clubProfile.contactEmail}</a>
                        </div>
                      </div>
                    )}
                    {clubProfile.contactPhone && (
                      <div className="flex items-center">
                        <div className="rounded-full bg-gray-100 p-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e]" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-500">Phone</p>
                          <a href={`tel:${clubProfile.contactPhone}`} className="text-[#1a4b8e] hover:underline">{clubProfile.contactPhone}</a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Social Media & Web */}
              {(clubProfile.website || clubProfile.linkedin || clubProfile.instagram) && (
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Social Media & Web</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clubProfile.website && (
                      <a href={clubProfile.website} target="_blank" rel="noopener noreferrer" 
                        className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1a4b8e] mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                        </svg>
                        Website
                      </a>
                    )}
                    {clubProfile.linkedin && (
                      <a href={clubProfile.linkedin} target="_blank" rel="noopener noreferrer" 
                        className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <svg className="h-5 w-5 text-[#1a4b8e] mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                        </svg>
                        LinkedIn
                      </a>
                    )}
                    {clubProfile.instagram && (
                      <a href={clubProfile.instagram} target="_blank" rel="noopener noreferrer" 
                        className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <svg className="h-5 w-5 text-[#1a4b8e] mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                        Instagram
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Long Description */}
            {clubProfile.longDescription && (
              <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">About The Club</h3>
                  <div className="prose max-w-none text-gray-600">
                    <p className="whitespace-pre-wrap">{clubProfile.longDescription}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Achievements */}
            {clubProfile.achivements && (
              <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Achievements</h3>
                  <div className="prose max-w-none text-gray-600">
                    <p className="whitespace-pre-wrap">{clubProfile.achivements}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recruitment Methods */}
            {clubProfile.recruitmentMethods && (
              <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recruitment Methods</h3>
                  <div className="prose max-w-none text-gray-600">
                    <p className="whitespace-pre-wrap">{clubProfile.recruitmentMethods}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Edit Profile Form */
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="bg-[#1a4b8e] px-6 py-4">
              <h2 className="text-xl font-bold text-white">Edit Club Profile</h2>
              <p className="text-blue-100 mt-1">Update your club information</p>
            </div>
            
            <form onSubmit={updateProfile} className="p-6">
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">Club Name</label>
                      <input 
                        type="text" 
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#1a4b8e] focus:border-[#1a4b8e]"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="userName" className="block text-sm font-medium text-gray-700">Username</label>
                      <input 
                        type="text" 
                        id="userName"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#1a4b8e] focus:border-[#1a4b8e]"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                {/* Descriptions */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Club Descriptions</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="shortDescription" className="block text-sm font-medium text-gray-700">Short Description</label>
                      <input 
                        type="text" 
                        id="shortDescription"
                        value={shortDescription}
                        onChange={(e) => setShortDescription(e.target.value)}
                        placeholder="Brief description of your club"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#1a4b8e] focus:border-[#1a4b8e]"
                      />
                    </div>
                    <div>
                      <label htmlFor="longDescription" className="block text-sm font-medium text-gray-700">Long Description</label>
                      <textarea 
                        id="longDescription"
                        rows={5}
                        value={longDescription}
                        onChange={(e) => setLongDescription(e.target.value)}
                        placeholder="Detailed information about your club"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#1a4b8e] focus:border-[#1a4b8e]"
                      ></textarea>
                    </div>
                  </div>
                </div>
                
                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">Contact Email</label>
                      <input 
                        type="email" 
                        id="contactEmail"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="contact@example.com"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#1a4b8e] focus:border-[#1a4b8e]"
                      />
                    </div>
                    <div>
                      <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">Contact Phone</label>
                      <input 
                        type="tel" 
                        id="contactPhone"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#1a4b8e] focus:border-[#1a4b8e]"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Social Media & Web */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Social Media & Web</h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label htmlFor="website" className="block text-sm font-medium text-gray-700">Website URL</label>
                      <input 
                        type="url" 
                        id="website"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://example.com"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#1a4b8e] focus:border-[#1a4b8e]"
                      />
                    </div>
                    <div>
                      <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700">LinkedIn URL</label>
                      <input 
                        type="url" 
                        id="linkedin"
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        placeholder="https://linkedin.com/company/example"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#1a4b8e] focus:border-[#1a4b8e]"
                      />
                    </div>
                    <div>
                      <label htmlFor="instagram" className="block text-sm font-medium text-gray-700">Instagram URL</label>
                      <input 
                        type="url" 
                        id="instagram"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="https://instagram.com/example"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#1a4b8e] focus:border-[#1a4b8e]"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Additional Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="achivements" className="block text-sm font-medium text-gray-700">Achievements</label>
                      <textarea 
                        id="achivements"
                        rows={4}
                        value={achivements}
                        onChange={(e) => setAchivements(e.target.value)}
                        placeholder="List your club's achievements"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#1a4b8e] focus:border-[#1a4b8e]"
                      ></textarea>
                    </div>
                    <div>
                      <label htmlFor="recruitmentMethods" className="block text-sm font-medium text-gray-700">Recruitment Methods</label>
                      <textarea 
                        id="recruitmentMethods"
                        rows={4}
                        value={recruitmentMethods}
                        onChange={(e) => setRecruitmentMethods(e.target.value)}
                        placeholder="Describe your club's recruitment process"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#1a4b8e] focus:border-[#1a4b8e]"
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Form Actions */}
              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={() => setUpdateProfileTab(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors mr-2"
                >
                  Cancel
                </button>
              
                <button
                  type="submit"
               
                  className={`bg-[#1a4b8e] text-white px-4 py-2 rounded-lg hover:bg-[#143b72] transition-colors flex items-center ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isSubmitting ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile