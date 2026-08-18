import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { ClubContextData } from "../context/ClubContext.jsx";
import { safeExternalUrl } from "../utils/url";
import { uploadDirect } from "../utils/directUpload";
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
  PasswordInput,
  Select,
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
  resources: [],
  annualEvents: [],
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
    if (!club?.accountEmail && !club?.contactEmail) {
      toast.error("Ask the administrator to add a recovery email to this account");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/club/password-reset/request`,
        { userName: club.userName, email: club.accountEmail || club.contactEmail },
      );
      if (!response.data.success) throw new Error(response.data.msg);
      setOtpSent(true);
      toast.success(`A one-time code was sent to ${club.accountEmail || club.contactEmail}`);
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
      const account = { userName: club.userName, email: club.accountEmail || club.contactEmail };
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
        <PasswordInput
          id={`${method}-new-password`}
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
        <PasswordInput
          id={`${method}-confirm-password`}
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
          Change it using your current password or a code sent to your private account email.
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
              <PasswordInput
                id="current-password"
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
            {!club?.accountEmail && !club?.contactEmail ? (
              <p className="rounded-sm bg-paper-2 p-4 text-sm leading-relaxed text-ink-3">
                Ask the administrator to add a recovery email to this account.
              </p>
            ) : !otpSent ? (
              <div>
                <p className="text-sm leading-relaxed text-ink-3">
                  We&rsquo;ll send a 6-digit code to <strong>{club.accountEmail || club.contactEmail}</strong>.
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
  const [logo, setLogo] = useState(null);
  const [banner, setBanner] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");
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
        resources: clubProfile.resources || [],
        annualEvents: clubProfile.annualEvents || [],
      });
      setIsLoading(false);
    }
  }, [clubProfile]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function updateProfile(event) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const [directAsset, directBannerAsset] = await Promise.all([
        uploadDirect(logo, { role: "club", kind: "clubLogo" }),
        uploadDirect(banner, { role: "club", kind: "clubBanner" }),
      ]);
      const payload = Object.fromEntries(
        ["name", "userName", "shortDescription", "longDescription", "website", "linkedin", "instagram", "achivements", "recruitmentMethods", "contactEmail", "contactPhone"]
          .map((key) => [key, form[key] || ""]),
      );
      payload.resourcesJSON = JSON.stringify(form.resources);
      payload.annualEventsJSON = JSON.stringify(form.annualEvents);
      if (directAsset) payload.directAsset = directAsset;
      if (directBannerAsset) payload.directBannerAsset = directBannerAsset;
      const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/updateProfile`, payload);
      if (response.data.success) {
        setClubProfile(response.data.club);
        setEditing(false);
        setLogo(null);
        setBanner(null);
        setLogoPreview("");
        setBannerPreview("");
        toast.success("Profile updated successfully");
      } else {
        toast.error(response.data.msg || "Failed to update profile");
      }
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "An error occurred while updating profile");
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
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Club logo" id="clubLogo" hint="Square or transparent image, ideally 512 × 512 px.">
                <label htmlFor="clubLogo" className="flex cursor-pointer items-center gap-4 rounded-sm border border-dashed border-line-2 bg-paper-2/50 p-4 transition-colors hover:border-accent">
                  {(logoPreview || clubProfile?.clubLogo) ? <img src={logoPreview || clubProfile.clubLogo} alt="Logo preview" className="h-16 w-16 rounded-md border border-line bg-surface object-contain p-1.5" /> : <Monogram name={form.name || "Club"} size="md" />}
                  <span><span className="block text-sm font-semibold">{logo ? logo.name : "Choose a new logo"}</span><span className="mt-1 block text-xs text-ink-3">JPG, PNG, or WebP under 5 MB</span></span>
                </label>
                <input id="clubLogo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files[0] || null; setLogo(file); setLogoPreview(file ? URL.createObjectURL(file) : ""); }} />
              </Field>
              <Field label="Club page banner" id="clubBanner" hint="Wide image, ideally 1600 × 600 px. Up to 20 MB; files above 10 MB are optimized automatically.">
                <label htmlFor="clubBanner" className="block cursor-pointer overflow-hidden rounded-sm border border-dashed border-line-2 bg-paper-2/50 transition-colors hover:border-accent">
                  {(bannerPreview || clubProfile?.clubBanner) ? <img src={bannerPreview || clubProfile.clubBanner} alt="Banner preview" className="aspect-[8/3] w-full object-cover" /> : <span className="grid aspect-[8/3] place-items-center px-4 text-center text-sm font-semibold text-ink-3">Choose a wide banner</span>}
                </label>
                <input id="clubBanner" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files[0] || null; setBanner(file); setBannerPreview(file ? URL.createObjectURL(file) : ""); }} />
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

          <Card className="reveal p-6">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="display text-xl">Student resources</h2><p className="mt-1.5 text-sm text-ink-3">Useful links, documents, videos, and repositories.</p></div><Button type="button" variant="secondary" size="sm" onClick={() => setForm({ ...form, resources: [...form.resources, { title: "", description: "", url: "", type: "link" }] })}>Add resource</Button></div>
            <div className="mt-6 space-y-5">{form.resources.map((resource, index) => <div key={resource._id || index} className="grid gap-4 border-t border-line pt-5 first:border-0 first:pt-0 sm:grid-cols-2"><Field label="Title" id={`resource-title-${index}`}><Input id={`resource-title-${index}`} value={resource.title} onChange={(event) => setForm({ ...form, resources: form.resources.map((item, current) => current === index ? { ...item, title: event.target.value } : item) })} required /></Field><Field label="Type" id={`resource-type-${index}`}><Select id={`resource-type-${index}`} value={resource.type || "link"} onChange={(event) => setForm({ ...form, resources: form.resources.map((item, current) => current === index ? { ...item, type: event.target.value } : item) })}><option value="link">Link</option><option value="document">Document</option><option value="video">Video</option><option value="repository">Repository</option><option value="other">Other</option></Select></Field><Field label="URL" id={`resource-url-${index}`} className="sm:col-span-2"><Input id={`resource-url-${index}`} type="url" value={resource.url} onChange={(event) => setForm({ ...form, resources: form.resources.map((item, current) => current === index ? { ...item, url: event.target.value } : item) })} required /></Field><Field label="Description" id={`resource-description-${index}`} className="sm:col-span-2"><Textarea id={`resource-description-${index}`} rows="2" className="min-h-0" value={resource.description || ""} onChange={(event) => setForm({ ...form, resources: form.resources.map((item, current) => current === index ? { ...item, description: event.target.value } : item) })} /></Field><button type="button" className="link text-left text-sm font-semibold text-bad" onClick={() => setForm({ ...form, resources: form.resources.filter((_, current) => current !== index) })}>Remove resource</button></div>)}</div>
          </Card>

          <Card className="reveal p-6">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="display text-xl">Annual events</h2><p className="mt-1.5 text-sm text-ink-3">Recurring club events students should know about.</p></div><Button type="button" variant="secondary" size="sm" onClick={() => setForm({ ...form, annualEvents: [...form.annualEvents, { name: "", description: "", eligibility: "", perks: "", tentativeDate: "", url: "" }] })}>Add annual event</Button></div>
            <div className="mt-6 space-y-6">{form.annualEvents.map((annualEvent, index) => { const update = (key, value) => setForm({ ...form, annualEvents: form.annualEvents.map((item, current) => current === index ? { ...item, [key]: value } : item) }); return <div key={annualEvent._id || index} className="grid gap-4 border-t border-line pt-6 first:border-0 first:pt-0 sm:grid-cols-2"><Field label="Name" id={`annual-name-${index}`}><Input id={`annual-name-${index}`} value={annualEvent.name} onChange={(event) => update("name", event.target.value)} required /></Field><Field label="Tentative date" id={`annual-date-${index}`}><Input id={`annual-date-${index}`} value={annualEvent.tentativeDate || ""} onChange={(event) => update("tentativeDate", event.target.value)} placeholder="e.g. First week of October" /></Field><Field label="Description" id={`annual-description-${index}`} className="sm:col-span-2"><Textarea id={`annual-description-${index}`} rows="3" className="min-h-0" value={annualEvent.description || ""} onChange={(event) => update("description", event.target.value)} /></Field><Field label="Eligibility" id={`annual-eligibility-${index}`}><Input id={`annual-eligibility-${index}`} value={annualEvent.eligibility || ""} onChange={(event) => update("eligibility", event.target.value)} /></Field><Field label="Perks" id={`annual-perks-${index}`}><Input id={`annual-perks-${index}`} value={annualEvent.perks || ""} onChange={(event) => update("perks", event.target.value)} /></Field><Field label="Website" id={`annual-url-${index}`} className="sm:col-span-2"><Input id={`annual-url-${index}`} type="url" value={annualEvent.url || ""} onChange={(event) => update("url", event.target.value)} /></Field><button type="button" className="link text-left text-sm font-semibold text-bad" onClick={() => setForm({ ...form, annualEvents: form.annualEvents.filter((_, current) => current !== index) })}>Remove annual event</button></div>; })}</div>
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
        <>
        <div className="relative mt-10 aspect-[8/3] overflow-hidden rounded-md border border-line bg-gradient-to-br from-ink via-ink-2 to-accent shadow-sm">
          {clubProfile?.clubBanner && <img src={clubProfile.clubBanner} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
          <div className="absolute bottom-5 left-5 flex items-end gap-4">
            {clubProfile?.clubLogo ? <img src={clubProfile.clubLogo} alt={`${clubProfile.name} logo`} className="h-20 w-20 rounded-lg border border-white/70 bg-white object-contain p-2 shadow-lg" /> : <Monogram name={clubProfile?.name || "Club"} size="lg" />}
            <p className="display pb-1 text-xl text-white sm:text-2xl">{clubProfile?.name}</p>
          </div>
        </div>
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
            {clubProfile?.annualEvents?.length > 0 && <section className="ruled-top pt-8"><h2 className="display text-xl">Annual events</h2><div className="mt-5 space-y-4">{clubProfile.annualEvents.map((annualEvent) => <Card key={annualEvent._id} className="p-5"><h3 className="font-semibold">{annualEvent.name}</h3><p className="mt-2 text-sm text-ink-3">{annualEvent.description}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-2">{annualEvent.tentativeDate && <span>{annualEvent.tentativeDate}</span>}{annualEvent.eligibility && <span>Eligibility: {annualEvent.eligibility}</span>}{annualEvent.perks && <span>Perks: {annualEvent.perks}</span>}</div></Card>)}</div></section>}
            {clubProfile?.resources?.length > 0 && <section className="ruled-top pt-8"><h2 className="display text-xl">Resources</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{clubProfile.resources.map((resource) => <a key={resource._id} href={resource.url} target="_blank" rel="noreferrer" className="card card-interactive p-4"><p className="font-semibold">{resource.title}</p><p className="mt-1 text-xs capitalize text-ink-3">{resource.type}</p></a>)}</div></section>}

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
              {clubProfile?.clubLogo ? <img src={clubProfile.clubLogo} alt={`${clubProfile.name} logo`} className="h-24 w-24 rounded-lg border border-line bg-surface object-contain p-2 shadow-sm" /> : <Monogram name={clubProfile?.name || "Club"} size="lg" />}
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
        </>
      )}
    </Page>
  );
}
