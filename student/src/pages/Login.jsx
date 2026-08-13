import { useContext, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";
import { StudentContextData } from "../context/StudentContext";
import AuthShell from "../components/AuthShell";
import { Button, Field, Input } from "../components/ui";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setLoggedInStudent, refreshProfile } = useContext(StudentContextData);
  const navigate = useNavigate();

  async function handleLogin(event) {
    event.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/student/login`, {
        email,
        password,
      });
      if (response.data.success) {
        localStorage.setItem("token", response.data.token);
        toast.success(response.data.msg || "Login successful");
        setLoggedInStudent(true);
        await refreshProfile();
        const returnTo = sessionStorage.getItem("studentReturnTo");
        sessionStorage.removeItem("studentReturnTo");
        navigate(returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/", { replace: true });
      } else {
        toast.error(response.data.msg || "Login failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || "Server error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Student access"
      title="Welcome back"
      description="Sign in with the IITR email you registered with."
      footer={
        <p>
          Don&rsquo;t have an account?{" "}
          <Link to="/register" className="link link-accent">
            Create one
          </Link>
        </p>
      }
    >
      <form onSubmit={handleLogin} className="space-y-5">
        <Field label="IITR email" id="email" required>
          <Input
            id="email"
            type="email"
            placeholder="you@iitr.ac.in"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Field label="Password" id="password" required>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
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
