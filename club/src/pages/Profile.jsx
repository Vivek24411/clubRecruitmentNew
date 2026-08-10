import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { ClubContextData } from "../context/ClubContext.jsx";
import { safeExternalUrl } from "../utils/url";
import {
  Button,
  Card,
  Field,
  Input,
  Meta,
  Modal,
  Monogram,
  Page,
  PageHeader,
  Skeleton,
  Textarea,
} from "../components/ui";

const EMPTY = {
  name: "",
  userName: "",
  shortDescription: "",
  longDescription: "",
  website: "",
  linkedin: "",
  instagram: "",
  achivements: "",
  recruitmentMethods: "",
  contactEmail: "",
  contactPhone: "",
};

/** A prose block that only renders when the club has filled it in. */
function Prose({ title, body }) {
  if (!body) return null;
  return (
    <section className="ruled-top pt-8">
      <h2 className="display text-xl">{title}</h2>
      <p className="mt-4 whitespace-pre-wrap leading-[1.75] text-ink-2">{body}</p>
    </section>
  );
}

function SocialRow({ label, href }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-3 rounded-sm bg-paper-2 px-3.5 py-2.5 text-sm transition-colors duration-300 hover:bg-paper-3"
    >
      <span className="font-medium">{label}</span>
      <span className="text-ink-4">↗</span>
    </a>
  );
}

function PasswordSecurity({ club, onPasswordChanged }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("current");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errorMessage = (error, fallback) =>
    error.response?.data?.msg || error.message || fallback;

  function clearForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setOtp("");
    setOtpSent(false);
  }

  function selectMethod(nextMethod) {
    setMethod(nextMethod);
    clearForm();
  }

  function validateNewPassword() {
    if (newPassword.length < 10) {
      toast.error("Password must be at least 10 characters");
      return false;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }
    return true;
  }

  async function changeWithCurrentPassword(event) {
    event.preventDefault();
    if (!validateNewPassword()) return;

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/changePassword`, {
        currentPassword,
        newPassword,
      });
      if (!response.data.success) throw new Error(response.data.msg);
      await onPasswordChanged("Password changed successfully. Please sign in again");
    } catch (error) {
      toast.error(errorMessage(error, "Unable to change password"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function requestOtp() {
    if (!club?.contactEmail) {
      toast.error("Add a contact email to your profile before using OTP recovery");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/club/password-reset/request`,
        { userName: club.userName, email: club.contactEmail },
      );
      if (!response.data.success) throw new Error(response.data.msg);
      setOtpSent(true);
      toast.success(`A one-time code was sent to ${club.contactEmail}`);
    } catch (error) {
      toast.error(errorMessage(error, "Unable to send OTP"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function changeWithOtp(event) {
    event.preventDefault();
    if (!validateNewPassword()) return;
    if (!/^\d{6}$/.test(otp)) {
      toast.error("Enter the 6-digit OTP");
      return;
    }

    setIsSubmitting(true);
    try {
      const account = { userName: club.userName, email: club.contactEmail };
      const verification = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/club/password-reset/verify`,
        { ...account, otp },
      );
      if (!verification.data.success) throw new Error(verification.data.msg);

      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/club/password-reset/complete`,
        {
          ...account,
          newPassword,
          resetToken: verification.data.verificationToken,
        },
      );
      if (!response.data.success) throw new Error(response.data.msg);
      await onPasswordChanged("Password reset successfully. Please sign in again");
    } catch (error) {
      toast.error(errorMessage(error, "Unable to reset password"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const passwordFields = (
    <>
      <Field label="New password" id={`${method}-new-password`} hint="At least 10 characters.">
        <Input
          id={`${method}-new-password`}
          type="password"
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
        id={`${method}-confirm-password`}
        error={
          confirmPassword && confirmPassword !== newPassword
            ? "Passwords do not match."
            : undefined
        }
      >
        <Input
          id={`${method}-confirm-password`}
          type="password"
          minLength={10}
          maxLength={72}
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </Field>
    </>
  );

  return (
    <>
      <Card className="p-6">
        <p className="eyebrow eyebrow-accent">Account security</p>
        <h2 className="display mt-2 text-xl">Password</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-3">
          Change it using your current password or a code sent to your contact email.
        </p>
        <Button className="mt-5" variant="secondary" block onClick={() => setOpen(true)}>
          Change password
        </Button>
      </Card>

      <Modal
        open={open}
        onClose={() => {
          if (!isSubmitting) {
            setOpen(false);
            clearForm();
          }
        }}
        title="Change club password"
        description="Choose how you want to confirm your identity. All existing sessions will be signed out."
      >
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Password confirmation method">
          <Button
            type="button"
            size="sm"
            variant={method === "current" ? "primary" : "secondary"}
            onClick={() => selectMethod("current")}
          >
            Current password
          </Button>
          <Button
            type="button"
            size="sm"
            variant={method === "otp" ? "primary" : "secondary"}
            onClick={() => selectMethod("otp")}
          >
            Email OTP
          </Button>
        </div>

        {method === "current" ? (
          <form className="mt-5 space-y-4" onSubmit={changeWithCurrentPassword}>
            <Field label="Current password" id="current-password" required>
              <Input
                id="current-password"
                type="password"
                maxLength={128}
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </Field>
            {passwordFields}
            <Button type="submit" block loading={isSubmitting}>
              {isSubmitting ? "Changing…" : "Change password"}
            </Button>
          </form>
        ) : (
          <div className="mt-5">
            {!club?.contactEmail ? (
              <p className="rounded-sm bg-paper-2 p-4 text-sm leading-relaxed text-ink-3">
                Add a contact email to your club profile before using OTP recovery.
              </p>
            ) : !otpSent ? (
              <div>
                <p className="text-sm leading-relaxed text-ink-3">
                  We&rsquo;ll send a 6-digit code to <strong>{club.contactEmail}</strong>.
                </p>
                <Button className="mt-4" type="button" block loading={isSubmitting} onClick={requestOtp}>
                  {isSubmitting ? "Sending…" : "Send OTP"}
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={changeWithOtp}>
                <Field label="One-time code" id="profile-password-otp" required>
                  <Input
                    id="profile-password-otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    className="tabular text-center text-lg tracking-[0.4em]"
                    required
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                </Field>
                {passwordFields}
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={requestOtp} loading={isSubmitting}>
                    Resend
                  </Button>
                  <Button type="submit" block loading={isSubmitting}>
                    {isSubmitting ? "Resetting…" : "Reset password"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

export default function Profile() {
  const { clubProfile, setClubProfile, signOut } = useContext(ClubContextData);
  const [isLoading, setIsLoading] = useState(!clubProfile);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (clubProfile) {
      setForm({
        name: clubProfile.name || "",
        userName: clubProfile.userName || "",
        shortDescription: clubProfile.shortDescription || "",
        longDescription: clubProfile.longDescription || "",
        website: clubProfile.website || "",
        linkedin: clubProfile.linkedin || "",
        instagram: clubProfile.instagram || "",
        achivements: clubProfile.achivements || "",
        recruitmentMethods: clubProfile.recruitmentMethods || "",
        contactEmail: clubProfile.contactEmail || "",
        contactPhone: clubProfile.contactPhone || "",
      });
      setIsLoading(false);
    }
  }, [clubProfile]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function updateProfile(event) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/club/updateProfile`,
        form,
      );
      if (response.data.success) {
        setClubProfile(response.data.club);
        setEditing(false);
        toast.success("Profile updated successfully");
      } else {
        toast.error(response.data.msg || "Failed to update profile");
      }
    } catch {
      toast.error("An error occurred while updating profile");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function logout() {
    await signOut();
    navigate("/login");
    toast.success("Logged out successfully");
  }

  async function passwordChanged(message) {
    await signOut();
    toast.success(message);
    navigate("/login", { replace: true });
  }

  if (isLoading) {
    return (
      <Page width="5xl">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-6 h-10 w-1/2" />
        <Skeleton className="mt-10 h-72 w-full" />
      </Page>
    );
  }

  const websiteUrl = safeExternalUrl(clubProfile?.website);
  const linkedinUrl = safeExternalUrl(clubProfile?.linkedin);
  const instagramUrl = safeExternalUrl(clubProfile?.instagram);
  const hasSocials = websiteUrl || linkedinUrl || instagramUrl;

  return (
    <Page width="5xl">
      <PageHeader
        eyebrow="Club profile"
        title={clubProfile?.name || "Your club"}
        description="This is what students see on your club page. Keep it current before recruitment opens."
        actions={
          editing ? (
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel editing
            </Button>
          ) : (
            <>
              <Button variant="accent" onClick={() => setEditing(true)}>
                Edit profile
              </Button>
              <Button variant="ghost" onClick={logout}>
                Sign out
              </Button>
            </>
          )
        }
      />

      {editing ? (
        /* ---------------------------------------------------------------- */
        /* Edit                                                              */
        /* ---------------------------------------------------------------- */
        <form onSubmit={updateProfile} className="mt-10 space-y-6">
          <Card className="reveal p-6">
            <h2 className="display text-xl">Identity</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Club name" id="name" required>
                <Input id="name" value={form.name} onChange={set("name")} required />
              </Field>
              <Field label="Username" id="userName" required hint="Used to sign in.">
                <Input id="userName" value={form.userName} onChange={set("userName")} required />
              </Field>
              <Field
                label="Short description"
                id="shortDescription"
                className="sm:col-span-2"
                hint="One line, shown in the club directory."
              >
                <Input
                  id="shortDescription"
                  value={form.shortDescription}
                  onChange={set("shortDescription")}
                />
              </Field>
              <Field label="About the club" id="longDescription" className="sm:col-span-2">
                <Textarea
                  id="longDescription"
                  rows={7}
                  value={form.longDescription}
                  onChange={set("longDescription")}
                />
              </Field>
            </div>
          </Card>

          <Card className="reveal p-6" style={{ "--d": "80ms" }}>
            <h2 className="display text-xl">Story</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Achievements" id="achivements">
                <Textarea
                  id="achivements"
                  rows={5}
                  value={form.achivements}
                  onChange={set("achivements")}
                />
              </Field>
              <Field label="How you recruit" id="recruitmentMethods">
                <Textarea
                  id="recruitmentMethods"
                  rows={5}
                  value={form.recruitmentMethods}
                  onChange={set("recruitmentMethods")}
                />
              </Field>
            </div>
          </Card>

          <Card className="reveal p-6" style={{ "--d": "150ms" }}>
            <h2 className="display text-xl">Contact and links</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Contact email" id="contactEmail">
                <Input
                  id="contactEmail"
                  type="email"
                  value={form.contactEmail}
                  onChange={set("contactEmail")}
                />
              </Field>
              <Field label="Contact phone" id="contactPhone">
                <Input
                  id="contactPhone"
                  type="tel"
                  value={form.contactPhone}
                  onChange={set("contactPhone")}
                />
              </Field>
              <Field label="Website" id="website">
                <Input
                  id="website"
                  type="url"
                  value={form.website}
                  onChange={set("website")}
                  placeholder="https://"
                />
              </Field>
              <Field label="Instagram" id="instagram">
                <Input
                  id="instagram"
                  type="url"
                  value={form.instagram}
                  onChange={set("instagram")}
                  placeholder="https://instagram.com/…"
                />
              </Field>
              <Field label="LinkedIn" id="linkedin" className="sm:col-span-2">
                <Input
                  id="linkedin"
                  type="url"
                  value={form.linkedin}
                  onChange={set("linkedin")}
                  placeholder="https://linkedin.com/company/…"
                />
              </Field>
            </div>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg" loading={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save profile"}
            </Button>
            <Button type="button" variant="secondary" size="lg" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        /* ---------------------------------------------------------------- */
        /* View                                                              */
        /* ---------------------------------------------------------------- */
        <div className="mt-10 grid gap-10 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            {clubProfile?.shortDescription && (
              <p className="reveal text-lg leading-relaxed text-ink-2">
                {clubProfile.shortDescription}
              </p>
            )}
            {clubProfile?.longDescription && (
              <section className="ruled-top pt-8">
                <h2 className="display text-xl">About</h2>
                <p className="mt-4 whitespace-pre-wrap leading-[1.75] text-ink-2">
                  {clubProfile.longDescription}
                </p>
              </section>
            )}
            <Prose title="Achievements" body={clubProfile?.achivements} />
            <Prose title="How you recruit" body={clubProfile?.recruitmentMethods} />

            {!clubProfile?.longDescription &&
              !clubProfile?.achivements &&
              !clubProfile?.recruitmentMethods && (
                <div className="rounded-sm border border-dashed border-line-2 px-6 py-10 text-center">
                  <p className="text-sm text-ink-3">
                    Your club page is still empty. Add a description so students know what you do.
                  </p>
                  <Button className="mt-5" variant="secondary" onClick={() => setEditing(true)}>
                    Fill in your profile
                  </Button>
                </div>
              )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
            <Card className="p-6">
              <Monogram name={clubProfile?.name || "Club"} size="lg" />
              <h2 className="display mt-5 text-xl leading-snug">{clubProfile?.name}</h2>
              <dl className="mt-6 space-y-4 border-t border-line pt-5">
                <Meta label="Username" value={clubProfile?.userName} />
                <Meta label="Contact email" value={clubProfile?.contactEmail} />
                <Meta label="Contact phone" value={clubProfile?.contactPhone} />
              </dl>
            </Card>

            <PasswordSecurity club={clubProfile} onPasswordChanged={passwordChanged} />

            {hasSocials && (
              <div>
                <h2 className="eyebrow mb-3">Links</h2>
                <div className="space-y-2.5">
                  <SocialRow label="Website" href={websiteUrl} />
                  <SocialRow label="Instagram" href={instagramUrl} />
                  <SocialRow label="LinkedIn" href={linkedinUrl} />
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </Page>
  );
}
