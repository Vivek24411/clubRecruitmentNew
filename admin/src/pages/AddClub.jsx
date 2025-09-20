import axios from 'axios';
import React from 'react'
import { toast } from 'react-toastify';

const AddClub = () => {
    const [name, setName] = React.useState("");
    const [userName, setUserName] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [clubLogo, setClubLogo] = React.useState(null);
    const [clubLogoPreview, setClubLogoPreview] = React.useState(null);


    async function uploadClublogo(e){
        const file = e.target.files[0];
        if(file){
            setClubLogo(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setClubLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setClubLogo(null);
            setClubLogoPreview(null);
        }
    }


    const handleAddClub = async(e) => {
        e.preventDefault();
        
        if (!name || !userName || !password) {
            toast.warning("Please fill all fields");
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('userName', userName);
        formData.append('password', password);
        if(clubLogo){
            formData.append('clubLogo', clubLogo);
        }
        
        setIsLoading(true);
        try {
            const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/admin/addClub`,formData,{
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if(response.data.success){
               toast.success(response.data.msg);
               // Reset form after successful submission
               setName("");
               setUserName("");
               setPassword("");
               setClubLogo(null);
               setClubLogoPreview(null);
            } else {
                toast.error(response.data.msg);
            }
        } catch (error) {
            console.error("Error adding club:", error);
            toast.error(error.message || "Failed to add club");
        } finally {
            setIsLoading(false);
        }
    }
    
    return (
        <div className="px-4 py-8 md:px-6 lg:px-8 max-w-6xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Add New Club</h1>
                <p className="text-gray-600 mt-2">Create a new club account with administrative privileges</p>
            </div>
            
            {/* Card Container */}
            <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
                <form onSubmit={handleAddClub}>
                    <div className="space-y-6">
                        {/* Club Name Field */}
                        <div>
                            <label htmlFor="clubName" className="block text-sm font-medium text-gray-700 mb-1">
                                Club Name
                            </label>
                            <input
                                type="text"
                                id="clubName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter club name"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-blue-800 outline-none transition"
                                required
                            />
                        </div>
                        
                        {/* Username Field */}
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                                Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="Enter club username"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-blue-800 outline-none transition"
                                required
                            />
                        </div>
                        
                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter secure password"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-blue-800 outline-none transition"
                                required
                            />
                            <p className="mt-1 text-xs text-gray-500">Password must be at least 6 characters long</p>
                        </div>
                        
                        {/* Club Logo Upload Field */}
                        <div>
                            <label htmlFor="clubLogo" className="block text-sm font-medium text-gray-700 mb-1">
                                Club Logo
                            </label>
                            <div className="mt-1 flex flex-col md:flex-row items-start gap-4">
                                <div className="flex-1 w-full md:w-auto">
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg px-6 py-8 text-center hover:border-blue-500 transition cursor-pointer" onClick={() => document.getElementById('clubLogo').click()}>
                                        <div className="space-y-1 text-center">
                                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <div className="text-sm text-gray-600">
                                                <label htmlFor="clubLogo" className="cursor-pointer text-blue-600 hover:text-blue-700">
                                                    Upload a club logo
                                                </label>
                                                <p className="mt-1 text-xs text-gray-500">PNG, JPG, or JPEG (max. 2MB)</p>
                                            </div>
                                        </div>
                                        <input 
                                            id="clubLogo" 
                                            name="clubLogo" 
                                            type="file" 
                                            className="sr-only" 
                                            accept=".jpg,.jpeg,.png"
                                            onChange={uploadClublogo}
                                        />
                                    </div>
                                </div>
                                
                                {clubLogoPreview && (
                                    <div className="flex flex-col items-center">
                                        <div className="relative w-32 h-32 border rounded-md overflow-hidden">
                                            <img 
                                                src={clubLogoPreview} 
                                                alt="Club logo preview" 
                                                className="w-full h-full object-cover"
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setClubLogo(null);
                                                    setClubLogoPreview(null);
                                                }}
                                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 focus:outline-none"
                                                title="Remove image"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-2">Preview</p>
                                    </div>
                                )}
                            </div>
                            <p className="mt-2 text-xs text-gray-500">Upload a logo to represent the club on the platform</p>
                        </div>
                        
                        {/* Submit Button */}
                        <div className="mt-8">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full md:w-auto px-6 py-3 bg-[#1a4b8e] text-white font-medium rounded-lg hover:bg-[#13396a] transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Creating...
                                    </span>
                                ) : "Add Club"}
                            </button>
                        </div>
                    </div>
                </form>
                
                {/* Information Card */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">Important Information</h3>
                            <div className="mt-2 text-sm text-blue-700">
                                <p>
                                    After creating a club account, the club administrator will be able to create and manage events, review applications, and more.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AddClub