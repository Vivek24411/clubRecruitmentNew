import React from "react";
import axios from "axios";
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
    cursor: "pointer",
    marginTop: "15px"
  },
  forgotPassword: {
    textAlign: "right",
    marginTop: "5px"
  },
  orDivider: {
    textAlign: "center",
    margin: "20px 0",
    position: "relative"
  },
  orText: {
    display: "inline-block",
    padding: "0 15px",
    backgroundColor: "white",
    position: "relative",
    zIndex: "1"
  },
  dividerLine: {
    position: "absolute",
    top: "50%",
    left: "0",
    right: "0",
    margin: "0",
    zIndex: "0"
  },
  linkContainer: {
    textAlign: "center",
    marginTop: "12px"
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
        }
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

const Login = () => {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [windowWidth, setWindowWidth] = React.useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  const navigate = useNavigate();
  
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


  async function handleLogin(){
    try{
      const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/student/login`, {
      email,
      password
    });

    
    if(response.data.success){
 
      toast.success("Login successful");
      localStorage.setItem("token", response.data.token);
      navigate("/");
    }else{
      toast.error(response.data.msg || "Login failed");
    }
    }catch(err){
    
      toast.error(err.message || "Server error");
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
        }}>Welcome back</h1>
        
        <form style={{...styles.form}}>
          <div style={{...styles.inputGroup}}>
            <label style={{...styles.label}}>IITR Email</label>
            <input
              type="text"
              placeholder="Enter IITR email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                ...styles.input,
                ...responsiveStyles.input
              }}
            />
          </div>
          
          <div style={{...styles.inputGroup}}>
            <label style={{...styles.label}}>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                ...styles.input,
                ...responsiveStyles.input
              }}
            />
         
          </div>
          
          <button 
            type="button"
            onClick={handleLogin}
            style={{
              ...styles.primaryButton,
              ...responsiveStyles.primaryButton
            }}
          >
            Sign In
          </button>
          
         
          
          <div className="text-center text-sm">Forgot Password? <Link className="text-[#1a4b8e] font-semibold" to="/forgotPassword">Reset</Link></div>
         
          <div style={{...styles.linkContainer}}>
            <div>
              Don't have an account? <Link to="/register" style={{...styles.link}}>Register</Link>
            </div>
          </div>
         

        </form>
      </div>
    </div>
  );
};

export default Login;
