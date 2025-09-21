import React from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [step, setStep] = React.useState(1); // Step 1: Email, Step 2: OTP and New Password
  const [isLoading, setIsLoading] = React.useState(false);

  async function sendOTP() {
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/student/sendOtp`,
        { email }
      );

      if (response.data.success) {
        toast.success("OTP sent to your email");
        setStep(2);
      } else {
        toast.error(response.data.msg || "Failed to send OTP");
      }
    } catch (error) {
      toast.error("Error sending OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyOTP() {
    if (!otp) {
      toast.error("Please enter the OTP");
      return;
    }
    
    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/student/verifyOtp`,
        {
          email,
          otp,
        }
      );

      if (response.data.success) {
        const passwordResponse = await axios.post(
          `${import.meta.env.VITE_BASE_URI}/student/forgotPassword`,
          {
            email,
            newPassword,
          }
        );

        if (passwordResponse.data.success) {
          toast.success("Password reset successful, please login");
          navigate("/login");
        } else {
          toast.error(passwordResponse.data.msg || "Failed to reset password");
        }
      } else {
        toast.error(response.data.msg || "Failed to verify OTP");
      }
    } catch (error) {
      toast.error("Error resetting password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-[#1a4b8e] min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-lg">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6">
          {step === 1 ? "Forgot Password" : "Reset Password"}
        </h1>
        
        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block font-medium">IITR Email</label>
              <input
                type="email"
                placeholder="Enter your IITR email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button 
              onClick={sendOTP}
              disabled={isLoading}
              className={`w-full bg-[#1a4b8e] text-white font-bold py-3 rounded-lg ${
                isLoading ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-800"
              }`}
            >
              {isLoading ? "Sending..." : "Send OTP"}
            </button>
            
            <div className="text-center mt-4">
              <Link to="/login" className="text-[#1a4b8e] font-medium hover:underline">
                Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block font-medium">Enter OTP</label>
              <input
                type="text"
                placeholder="Enter OTP sent to your email"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block font-medium">New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex space-x-3">
              <button 
                onClick={() => setStep(1)}
                className="w-1/3 bg-gray-200 text-gray-800 font-medium py-3 rounded-lg hover:bg-gray-300"
              >
                Back
              </button>
              <button 
                onClick={verifyOTP}
                disabled={isLoading}
                className={`w-2/3 bg-[#1a4b8e] text-white font-bold py-3 rounded-lg ${
                  isLoading ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-800"
                }`}
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
