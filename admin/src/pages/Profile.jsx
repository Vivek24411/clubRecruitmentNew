import React from "react";
import { AdminContextData } from "../context/AdminContext";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";

// Consistent styling with previous components
const styles = {
  container: {
    padding: "30px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  card: {
    background: "white",
    borderRadius: "20px",
    padding: "30px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
    marginBottom: "30px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    marginBottom: "30px",
  },
  avatar: {
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    backgroundColor: "#1a4b8e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: "20px",
    color: "white",
    fontSize: "40px",
    fontWeight: "bold",
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    margin: "0",
  },
  subtitle: {
    fontSize: "16px",
    color: "#666",
    margin: "5px 0 0 0",
  },
  infoSection: {
    marginTop: "20px",
  },
  infoTitle: {
    fontSize: "18px",
    fontWeight: "500",
    marginBottom: "10px",
    color: "#1a4b8e",
  },
  infoRow: {
    display: "flex",
    padding: "15px 0",
    borderBottom: "1px solid #eee",
  },
  infoLabel: {
    width: "200px",
    fontWeight: "500",
    color: "#555",
  },
  infoValue: {
    flex: "1",
    color: "#333",
  },
};

const Profile = () => {
  const contextValue = useContext(AdminContextData);
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("adminToken");
    navigate("/login");
  }


  // Handle case where context is not available
  if (!contextValue) {
    console.error(
      "AdminContextData is undefined. Make sure the provider is set up correctly."
    );
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p>
            Error: Context not available. Please make sure AdminContext provider
            is properly set up.
          </p>
        </div>
      </div>
    );
  }

  const { adminProfile } = contextValue;

  // Handle loading state
  if (!adminProfile) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p>Loading profile information...</p>
        </div>
      </div>
    );
  }

  // Get first letter of email for avatar
  const avatarLetter = adminProfile.email
    ? adminProfile.email[0].toUpperCase()
    : "A";

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.avatar}>{avatarLetter}</div>
          <div>
            <h1 style={styles.title}>Admin Profile</h1>
          </div>
        </div>

        <div style={styles.infoSection}>
          <h2 style={styles.infoTitle}>Account Information</h2>

          <div style={styles.infoRow}>
            <div style={styles.infoLabel}>Email Address</div>
            <div style={styles.infoValue}>{adminProfile.email}</div>
          </div>

        <button className="bg-red-500 text-white px-4 py-2 mt-2 rounded" onClick={logout}>Logout</button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
