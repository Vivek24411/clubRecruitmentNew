import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { Button, Field, Input, PasswordInput } from "../components/ui";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  async function requestOtp() {
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/club/password-reset/request`,
        { userName, email },
      );
      if (!response.data.success) throw new Error(response.data.msg);
      toast.success(response.data.msg || "If the account matches, an OTP has been sent");
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Unable to send OTP");
    } finally {
      setIsLoading(false);
    }
  }

  async function resetPassword() {
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
      const verification = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/club/password-reset/verify`,
        { userName, email, otp },
      );
      if (!verification.data.success) throw new Error(verification.data.msg);

      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/club/password-reset/complete`,
        {
          userName,
          email,
          newPassword,
          resetToken: verification.data.verificationToken,
        },
      );
      if (!response.data.success) throw new Error(response.data.msg);

      toast.success("Password reset successful. Please sign in");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Unable to reset password");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title={step === 1 ? "Reset your club password" : "Choose a new password"}
      description={
        step === 1
          ? "Enter your club username and private account email to receive a one-time code."
          : `Enter the code sent to ${email}, then choose a new password.`
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
            requestOtp();
          }}
        >
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
          <Field label="Account email" id="email" required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="club@iitr.ac.in"
              required
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
            resetPassword();
          }}
        >
          <Field label="One-time code" id="otp" required>
            <Input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="6-digit code"
              className="tabular text-center text-lg tracking-[0.4em]"
              required
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </Field>
          <Field label="New password" id="newPassword" hint="At least 10 characters.">
            <PasswordInput
              id="newPassword"
              minLength={10}
              maxLength={72}
              autoComplete="new-password"
              required
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
            <PasswordInput
              id="confirmPassword"
              minLength={10}
              maxLength={72}
              autoComplete="new-password"
              required
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
