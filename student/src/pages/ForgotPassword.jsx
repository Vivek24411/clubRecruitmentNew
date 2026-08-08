import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { Button, Field, Input } from "../components/ui";
import { isIitrInstituteEmail } from "../utils/email";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1: request code, 2: set new password
  const [isLoading, setIsLoading] = useState(false);

  async function sendOTP() {
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    if (!isIitrInstituteEmail(email)) {
      toast.error("Use the format name_s@branch.iitr.ac.in");
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/student/sendOtp`, {
        email,
        purpose: "password_reset",
      });
      if (response.data.success) {
        toast.success("OTP sent to your email");
        setStep(2);
      } else {
        toast.error(response.data.msg || "Failed to send OTP");
      }
    } catch {
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
    if (newPassword.length < 10) {
      toast.error("Password must be at least 10 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/student/verifyOtp`, {
        email,
        otp,
        purpose: "password_reset",
      });

      if (response.data.success) {
        const passwordResponse = await axios.post(
          `${import.meta.env.VITE_BASE_URI}/student/forgotPassword`,
          { email, newPassword, resetToken: response.data.verificationToken },
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
    } catch {
      toast.error("Error resetting password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title={step === 1 ? "Reset your password" : "Choose a new password"}
      description={
        step === 1
          ? "Enter your IITR email and we'll send a one-time code."
          : `Enter the code sent to ${email}, then pick a new password.`
      }
      footer={
        <p>
          Remembered it?{" "}
          <Link to="/login" className="link link-accent">
            Back to sign in
          </Link>
        </p>
      }
    >
      {step === 1 ? (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            sendOTP();
          }}
        >
          <Field label="IITR email" id="email" required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name_s@branch.iitr.ac.in"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Button type="submit" size="lg" block loading={isLoading}>
            {isLoading ? "Sending…" : "Send code"}
          </Button>
        </form>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            verifyOTP();
          }}
        >
          <Field label="One-time code" id="otp">
            <Input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              className="tabular text-center text-lg tracking-[0.4em]"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
            />
          </Field>

          <Field label="New password" id="newPassword" hint="At least 10 characters.">
            <Input
              id="newPassword"
              type="password"
              minLength={10}
              maxLength={72}
              autoComplete="new-password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>

          <Field
            label="Confirm new password"
            id="confirmPassword"
            error={
              confirmPassword && confirmPassword !== newPassword
                ? "Passwords do not match."
                : undefined
            }
          >
            <Input
              id="confirmPassword"
              type="password"
              minLength={10}
              maxLength={72}
              autoComplete="new-password"
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </Field>

          <div className="flex gap-3">
            <Button type="button" variant="secondary" size="lg" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit" size="lg" block loading={isLoading}>
              {isLoading ? "Resetting…" : "Reset password"}
            </Button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
