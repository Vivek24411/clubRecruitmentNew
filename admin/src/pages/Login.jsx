
import React from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";
import { AdminContextData } from "../context/AdminContext";
import { useContext } from "react";

// Custom responsive styles (same as student)
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
  if (typeof window !== "undefined") {
    const width = window.innerWidth;
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
  const {setLoggedInAdmin} = useContext(AdminContextData);

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

  async function handleLogin(e) {
    e.preventDefault()
    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/admin/login`, {
        email,
        password
      });

      console.log(response);
      
      if (response.data.success) {
        toast.success("Login successful");
        localStorage.setItem("adminToken", response.data.token);
        setLoggedInAdmin(true);
        navigate("/");
      } else {
        toast.error(response.data.msg);
      }
    } catch (error) {
      console.error("Error during login:", error);
      toast.error(error.message || "An error occurred. Please try again.");
    }
  }

  return (
    <div style={{ ...styles.container }}>
      <div style={{
        ...styles.formContainer,
        ...responsiveStyles.formContainer
      }}>
        <h1 style={{
          ...styles.heading,
          ...responsiveStyles.heading
        }}>Admin Login</h1>
        <form style={{ ...styles.form }}>
          <div style={{ ...styles.inputGroup }}>
            <label style={{ ...styles.label }}>Admin Email</label>
            <input
              type="text"
              placeholder="Enter admin email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                ...styles.input,
                ...responsiveStyles.input
              }}
            />
          </div>
          <div style={{ ...styles.inputGroup }}>
            <label style={{ ...styles.label }}>Password</label>
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
          <div style={{ ...styles.linkContainer }}>
            {/* No register link for admin, but you can add a forgot password or help link if needed */}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;