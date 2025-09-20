import axios from "axios";
import React from "react";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";

// Custom responsive styles
const styles = {
  container: {
    background: "#1a4b8e",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  formContainer: {
    background: "white",
    borderRadius: "20px",
    padding: "30px",
    width: "100%",
    maxWidth: "450px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
  },
  heading: {
    textAlign: "center",
    fontSize: "28px",
    marginBottom: "30px",
    fontWeight: "bold"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px"
  },
  inputGroup: {
    marginBottom: "5px"
  },
  label: {
    display: "block",
    marginBottom: "5px",
    fontWeight: "500"
  },
  input: {
    width: "100%",
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "16px"
  },
  primaryButton: {
    background: "#1a4b8e",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer"
  },
  secondaryButton: {
    background: "#e0e0e0",
    color: "#1a4b8e",
    border: "none",
    borderRadius: "8px",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer"
  },
  linkContainer: {
    textAlign: "center",
    marginTop: "20px"
  },
  link: {
    color: "#1a4b8e",
    textDecoration: "none",
    fontWeight: "bold"
  }
};

// Media queries for responsive design
const getResponsiveStyles = () => {
  // Check if window is available (client-side)
  if (typeof window !== "undefined") {
    const width = window.innerWidth;
    
    // Mobile styles (small screens)
    if (width < 480) {
      return {
        formContainer: {
          padding: "20px 15px",
          borderRadius: "15px",
        },
        heading: {
          fontSize: "24px",
          marginBottom: "20px",
        },
        input: {
          padding: "10px",
          fontSize: "14px",
        },
        primaryButton: {
          padding: "12px",
          fontSize: "15px",
        },
        secondaryButton: {
          padding: "12px",
          fontSize: "15px",
        },
      };
    }
    
    // Tablet styles (medium screens)
    if (width < 768) {
      return {
        formContainer: {
          padding: "25px 20px",
        },
        heading: {
          fontSize: "26px",
        }
      };
    }
  }
  
  return {};
};

const Register = () => {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [branch, setBranch] = React.useState("");
  const [year, setYear] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [otpInput, setOtpInput] = React.useState(false);
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [sendingOTP, setSendingOTP] = React.useState(false);
  const [verifyingOTP, setVerifyingOTP] = React.useState(false);
  const [registering, setRegistering] = React.useState(false);
  const [windowWidth, setWindowWidth] = React.useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  const navigate = useNavigate();
  const regex = /@.*iitr\.ac\.in$/i;

  // Responsive styles
  const responsiveStyles = React.useMemo(() => getResponsiveStyles(), [windowWidth]);
  
  // Add window resize listener
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => {
        setWindowWidth(window.innerWidth);
      };
      
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);




  async function sendOTP() {
    setSendingOTP(true);
    if(!regex.test(email)){
      toast.error("Please enter a valid IITR email");
      setSendingOTP(false);
      return;
    }
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/student/sendOtp`,
        {
          email,
        }
      );

      if (response.data.success) {
        toast.success("OTP sent successfully");
        setOtpInput(true);
      } else {
        toast.error(response.data.msg || "Failed to send OTP");
      }
    } catch (error) {
      toast.error("Error sending OTP. Please try again.");
      console.error(error);
    } finally {
      setSendingOTP(false);  // Reset the sending state regardless of outcome
    }
  }

  async function verifyOtpAndRegister(e) {
    e.preventDefault();
    setVerifyingOTP(true);
    setRegistering(true);
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/student/verifyOtp`,
        {
          email,
          otp,
        }
      );

      if (response.data.success) {
        toast.success("OTP verified successfully");

        try {
          const registerResponse = await axios.post(
            `${import.meta.env.VITE_BASE_URI}/student/register`,
            {
              email,
              name,
              password,
              branch,
              year,
              phoneNumber
            }
          );

          if (registerResponse.data.success) {
            toast.success("Registration successful");
            await localStorage.setItem("token", registerResponse.data.token);
            navigate("/");
          } else {
            toast.error(registerResponse.data.msg || "Registration failed");
            setRegistering(false);
          }
        } catch (registerError) {
          console.error(registerError);
          toast.error("Error during registration. Please try again.");
          setRegistering(false);
        }
      } else {
        toast.error(response.data.msg || "OTP verification failed");
        setVerifyingOTP(false);
        setRegistering(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error verifying OTP. Please try again.");
      setVerifyingOTP(false);
      setRegistering(false);
    }
  }

  return (
    <div style={{...styles.container}}>
      <div style={{
        ...styles.formContainer, 
        ...responsiveStyles.formContainer
      }}>
        <h1 style={{
          ...styles.heading,
          ...responsiveStyles.heading
        }}>Registration</h1>
        
        <form style={{...styles.form}}>
          <div style={{...styles.inputGroup}}>
            <label style={{...styles.label}}>Name</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
              }}
              placeholder="Enter your name"
              style={{
                ...styles.input,
                ...responsiveStyles.input
              }}
            />
          </div>
          
          <div style={{...styles.inputGroup}}>
            <label style={{...styles.label}}>Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              placeholder="Enter your IITR email"
              style={{
                ...styles.input,
                ...responsiveStyles.input
              }}
            />
          </div>
          
          <div style={{...styles.inputGroup}}>
            <label style={{...styles.label}}>Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              placeholder="Create a password"
              style={{
                ...styles.input,
                ...responsiveStyles.input
              }}
            />
          </div>

          <div>
            <label style={{...styles.label}}>Phone Number</label>
            <input
              required
              type="text"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
              }}
              placeholder="Enter your phone number"
              style={{
                ...styles.input,
                ...responsiveStyles.input
              }}
            />
          </div>
          
          <div style={{...styles.inputGroup}}>
            <label style={{...styles.label}}>Branch</label>
            <input
              required
              type="text"
              value={branch}
              onChange={(e) => {
                setBranch(e.target.value);
              }}
              placeholder="Enter your branch"
              style={{
                ...styles.input,
                ...responsiveStyles.input
              }}
            />
          </div>
          
          <div style={{...styles.inputGroup}}>
            <label style={{...styles.label}}>Year</label>
            <input
              required
              type="text"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
              }}
              placeholder="First, Second, Third, Fourth"
              style={{
                ...styles.input,
                ...responsiveStyles.input
              }}
            />
          </div>
          
          {otpInput && (
            <div style={{...styles.inputGroup}}>
              <label style={{...styles.label}}>OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                }}
                placeholder="Enter OTP"
                style={{
                  ...styles.input,
                  ...responsiveStyles.input
                }}
              />
            </div>
          )}
          
          {otpInput ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button 
                type="submit" 
                onClick={verifyOtpAndRegister}
                disabled={verifyingOTP || registering}
                style={{
                  ...styles.primaryButton,
                  ...responsiveStyles.primaryButton,
                  opacity: (verifyingOTP || registering) ? 0.7 : 1
                }}
              >
                {verifyingOTP || registering ? "Processing..." : "Verify OTP and Register"}
              </button>
              <button 
                type="button" 
                onClick={sendOTP}
                disabled={sendingOTP}
                style={{
                  ...styles.secondaryButton,
                  ...responsiveStyles.secondaryButton,
                  opacity: sendingOTP ? 0.7 : 1
                }}
              >
                {sendingOTP ? "Sending..." : "Resend OTP"}
              </button>
            </div>
          ) : (
            <button 
              type="button" 
              onClick={sendOTP}
              disabled={sendingOTP}
              style={{
                ...styles.primaryButton,
                ...responsiveStyles.primaryButton,
                marginTop: "10px",
                opacity: sendingOTP ? 0.7 : 1
              }}
            >
              {sendingOTP ? "Sending..." : "Get OTP"}
            </button>
          )}
          
          <div style={{...styles.linkContainer}}>
            Already have an account? <Link to="/login" style={{...styles.link}}>Sign In</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
