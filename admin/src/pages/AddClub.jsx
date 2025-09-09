import axios from 'axios';
import React from 'react'
import { toast } from 'react-toastify';

const AddClub = () => {
    const [name, setName] = React.useState("");
    const [userName, setUserName] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);

    const handleAddClub = async(e) => {
        e.preventDefault();
        
        if (!name || !userName || !password) {
            toast.warning("Please fill all fields");
            return;
        }
        
        setIsLoading(true);
        try {
            const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/admin/addClub`,{
                name,
                userName,
                password
            },{
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("adminToken")}`
                }
            });

            if(response.data.success){
               toast.success(response.data.msg);
               // Reset form after successful submission
               setName("");
               setUserName("");
               setPassword("");
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