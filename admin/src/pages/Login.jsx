import { useContext, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { AdminContextData } from "../context/AdminContext";
import AuthShell from "../components/AuthShell";
import { Button, Field, Input } from "../components/ui";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setLoggedInAdmin, refreshAdminProfile } = useContext(AdminContextData);
  const navigate = useNavigate();

  async function handleLogin(event) {
    event.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/admin/login`, {
        email,
        password,
      });
      if (response.data.success) {
        toast.success("Login successful");
        setLoggedInAdmin(true);
        await refreshAdminProfile();
        navigate("/", { replace: true });
      } else {
        toast.error(response.data.msg);
      }
    } catch (error) {
      toast.error(error.response?.data?.msg || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Restricted"
      title="Administration console"
      description="Sign in with your administrator account."
      footer={
        <p className="text-ink-3">
          This console controls platform-wide recruitment settings. All actions are recorded in the
          audit log.
        </p>
      }
    >
      <form onSubmit={handleLogin} className="space-y-5">
        <Field label="Admin email" id="email" required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="admin@iitr.ac.in"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Field label="Password" id="password" required>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <Button type="submit" size="lg" block loading={isLoading}>
          {isLoading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
