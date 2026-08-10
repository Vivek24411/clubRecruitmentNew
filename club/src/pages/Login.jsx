import { useContext, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import { ClubContextData } from "../context/ClubContext.jsx";
import AuthShell from "../components/AuthShell";
import { Button, Field, Input } from "../components/ui";

export default function Login() {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setLoggedInClub, refreshClubProfile } = useContext(ClubContextData);
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!userName || !password) {
      toast.warning("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/login`, {
        userName,
        password,
      });
      if (response.data.success) {
        localStorage.setItem("clubToken", response.data.token);
        toast.success("Login successful");
        setLoggedInClub(true);
        await refreshClubProfile();
        navigate("/", { replace: true });
      } else {
        toast.error(response.data.msg);
      }
    } catch (error) {
      toast.error(error.response?.data?.msg || "An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Club workspace"
      title="Sign in to your club"
      description="Manage recruitment events, information sessions, and applications."
      footer={
        <p className="text-ink-3">
          Credentials are issued by the recruitment admin. If you cannot access your registered
          contact email, ask the admin for help.
        </p>
      }
    >
      <form onSubmit={handleLogin} className="space-y-5">
        <Field label="Club username" id="username" required>
          <Input
            id="username"
            type="text"
            autoComplete="username"
            placeholder="Enter your club username"
            required
            value={userName}
            onChange={(event) => setUserName(event.target.value)}
          />
        </Field>

        <Field label="Password" id="password" required>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <div className="flex justify-end">
          <Link to="/forgotPassword" className="link text-sm text-ink-3">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" block loading={isLoading}>
          {isLoading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
