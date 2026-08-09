import { useContext, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";
import { StudentContextData } from "../context/StudentContext";
import AuthShell from "../components/AuthShell";
import { Button, Field, Input } from "../components/ui";
import { isIitrInstituteEmail } from "../utils/email";

/** Two-dot progress rail; the fill slides as the step advances. */
function StepRail({ step, labels }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        {labels.map((label, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <div key={label} className="flex flex-1 items-center gap-3">
              <span
                className={`grid h-6 w-6 flex-none place-items-center rounded-full border text-[0.6875rem] font-semibold transition-all duration-500 ${
                  done
                    ? "border-accent bg-accent text-white"
                    : current
                      ? "border-accent text-accent"
                      : "border-line-2 text-ink-4"
                }`}
              >
                {done ? "✓" : index + 1}
              </span>
              <span
                className={`eyebrow transition-colors duration-500 ${
                  current || done ? "text-ink" : "text-ink-4"
                }`}
              >
                {label}
              </span>
              {index < labels.length - 1 && (
                <span className="h-px flex-1 overflow-hidden bg-line">
                  <span
                    className="block h-full bg-accent transition-transform duration-700 ease-out"
                    style={{
                      transform: `scaleX(${done ? 1 : 0})`,
                      transformOrigin: "left",
                    }}
                  />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const DETAIL_FIELDS = [
  { key: "name", label: "Full name", type: "text", placeholder: "Ada Lovelace", autoComplete: "name" },
  { key: "email", label: "IITR email", type: "email", placeholder: "you@iitr.ac.in", autoComplete: "email" },
  { key: "password", label: "Password", type: "password", placeholder: "At least 10 characters", autoComplete: "new-password", minLength: 10, maxLength: 72 },
  { key: "enrollmentNumber", label: "Enrollment number", type: "text", placeholder: "22114001" },
  { key: "phoneNumber", label: "Phone number", type: "tel", placeholder: "98765 43210", autoComplete: "tel" },
  { key: "branch", label: "Branch", type: "text", placeholder: "Computer Science" },
  { key: "year", label: "Year", type: "text", placeholder: "First, Second, Third, Fourth" },
];

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    branch: "",
    year: "",
    phoneNumber: "",
    enrollmentNumber: "",
  });
  const [otp, setOtp] = useState("");
  const [otpInput, setOtpInput] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [registering, setRegistering] = useState(false);

  const navigate = useNavigate();
  const { setLoggedInStudent, refreshProfile } = useContext(StudentContextData);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  async function sendOTP() {
    setSendingOTP(true);
    if (!isIitrInstituteEmail(form.email)) {
      toast.error("Please enter a valid IITR email");
      setSendingOTP(false);
      return;
    }
    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/student/sendOtp`, {
        email: form.email,
        purpose: "signup",
      });
      if (response.data.success) {
        toast.success(response.data.msg || "OTP accepted for delivery");
        setOtpInput(true);
      } else {
        toast.error(response.data.msg || "Failed to send OTP");
      }
    } catch (error) {
      toast.error("Error sending OTP. Please try again.");
      console.error(error);
    } finally {
      setSendingOTP(false);
    }
  }

  async function verifyOtpAndRegister(event) {
    event.preventDefault();
    setVerifyingOTP(true);
    setRegistering(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/student/verifyOtp`, {
        email: form.email,
        otp,
        purpose: "signup",
      });

      if (response.data.success) {
        toast.success("OTP verified successfully");
        try {
          const registerResponse = await axios.post(
            `${import.meta.env.VITE_BASE_URI}/student/register`,
            { ...form, verificationToken: response.data.verificationToken },
          );
          if (registerResponse.data.success) {
            toast.success("Registration successful");
            setLoggedInStudent(true);
            await refreshProfile();
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
    <AuthShell
      eyebrow="Create account"
      title={otpInput ? "Verify your email" : "Join the recruitment cycle"}
      description={
        otpInput
          ? `We sent a one-time code to ${form.email}. Enter it below to finish creating your account.`
          : "Register with your institute email. You'll confirm it with a one-time code."
      }
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/login" className="link link-accent">
            Sign in
          </Link>
        </p>
      }
    >
      <StepRail step={otpInput ? 1 : 0} labels={["Details", "Verify"]} />

      {otpInput ? (
        <form onSubmit={verifyOtpAndRegister} className="space-y-5">
          <Field label="One-time code" id="otp" hint="The code expires shortly after it is sent.">
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

          <Button type="submit" size="lg" block loading={verifyingOTP || registering}>
            {verifyingOTP || registering ? "Creating account…" : "Verify and register"}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setOtpInput(false)}
              className="link text-ink-3"
            >
              ← Edit details
            </button>
            <button
              type="button"
              onClick={sendOTP}
              disabled={sendingOTP}
              className="link link-accent disabled:opacity-50"
            >
              {sendingOTP ? "Sending…" : "Resend code"}
            </button>
          </div>
        </form>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            sendOTP();
          }}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            {DETAIL_FIELDS.map(({ key, label, ...inputProps }) => (
              <Field
                key={key}
                id={key}
                label={label}
                required
                className={key === "name" || key === "email" ? "sm:col-span-2" : undefined}
              >
                <Input
                  id={key}
                  required
                  value={form[key]}
                  onChange={set(key)}
                  {...inputProps}
                />
              </Field>
            ))}
          </div>

          <Button type="submit" size="lg" block loading={sendingOTP}>
            {sendingOTP ? "Sending code…" : "Continue"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
