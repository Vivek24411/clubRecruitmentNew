import React from 'react'
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { ClubContextData } from '../context/ClubContext.jsx';


const Login = () => {
    const [userName, setUserName] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const {setLoggedInClub} = useContext(ClubContextData);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!userName || !password) {
            toast.warning("Please fill in all fields");
            return;
        }
        
        setIsLoading(true);
        try {
            const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/login`, {
                userName,
                password
            });

            if(response.data.success){
                toast.success("Login successful");
                localStorage.setItem("clubToken", response.data.token);
                setLoggedInClub(true);
                navigate("/");
            }else{
                toast.error(response.data.msg);
            }
        } catch (error) {
            console.error("Login error:", error);
            toast.error(error.response?.data?.msg || "An error occurred during login");
        } finally {
            setIsLoading(false);
        }
    }
    
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#1a4b8e] px-4 py-12">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Logo/Header Area */}
                <div className="px-8 py-6">
                    <h2 className="text-center text-3xl font-bold text-gray-800 mb-2">Club Login</h2>
                    <p className="text-center text-gray-600 text-sm mb-6">
                        Sign in to manage your club's recruitment activities
                    </p>
                </div>

                {/* Form Area */}
                <div className="px-8 pt-2 pb-8">
                    <form onSubmit={handleLogin}>
                        {/* Username Field */}
                        <div className="mb-6">
                            <label 
                                className="block text-gray-700 text-sm font-medium mb-2" 
                                htmlFor="username"
                            >
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="Enter your club username"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Password Field */}
                        <div className="mb-6">
                            <label 
                                className="block text-gray-700 text-sm font-medium mb-2" 
                                htmlFor="password"
                            >
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Login Button */}
                        <div className="mb-6">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-[#1a4b8e] text-white font-medium py-3 px-4 rounded-lg hover:bg-[#15407a] transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70"
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Signing in...
                                    </div>
                                ) : (
                                    "Sign In"
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Footer with Help Text */}
                    <div className="text-center mt-6 border-t border-gray-200 pt-6">
                        <p className="text-sm text-gray-600">
                            Having trouble logging in? Contact the admin at <span className="text-[#1a4b8e] font-medium">admin@example.com</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login