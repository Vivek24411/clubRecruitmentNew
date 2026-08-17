import { useCallback, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { uploadDirect } from "../utils/directUpload";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { StudentContextData } from "../context/StudentContext";
import { Button, Card, Field, Input, Meta, Monogram, Page, PageHeader } from "../components/ui";
import { disablePushNotifications, enablePushNotifications, getPushNotificationState } from "../utils/pushNotifications";

const PROGRAMME_LABELS = {
  undergraduate: "Undergraduate",
  mtech: "M.Tech.",
  msc: "M.Sc.",
  mba: "MBA",
  phd: "PhD",
};

const DETAIL_FIELDS = [
  ["name", "Full name"],
  ["phoneNumber", "Phone number"],
];

const PASSWORD_FIELDS = [
  ["currentPassword", "Current password", "current-password"],
  ["newPassword", "New password", "new-password"],
  ["confirmPassword", "Confirm new password", "new-password"],
];

/** Checkbox styled to match the paper/ink system rather than the OS default. */
function Check({ checked, onChange, label }) {
  return (
    <label className="group flex cursor-pointer items-center gap-2.5 text-sm">
      <span className="relative flex h-4 w-4 flex-none items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer absolute inset-0 cursor-pointer opacity-0"
        />
        <span className="h-4 w-4 rounded-xs border border-line-2 bg-surface transition-all duration-200 peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/30" />
        <svg
          viewBox="0 0 12 12"
          className="pointer-events-none absolute h-3 w-3 scale-50 text-white opacity-0 transition-all duration-200 peer-checked:scale-100 peer-checked:opacity-100"
          aria-hidden="true"
        >
          <path
            d="M2.5 6.2l2.3 2.3 4.7-4.9"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </span>
      {label}
    </label>
  );
}

export default function Profile() {
  const { profile, setProfile, signOut } = useContext(StudentContextData);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phoneNumber: "",
    notificationPreferences: { email: true, inApp: true },
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [preview, setPreview] = useState("");
  const pictureInput = useRef(null);
  const [pushState, setPushState] = useState({ status: "loading", configured: true });
  const [pushWorking, setPushWorking] = useState(false);

  const refreshPushState = useCallback(() => {
    getPushNotificationState().then(setPushState);
  }, []);

  useEffect(() => {
    refreshPushState();
    const onPushStateChanged = (event) => {
      if (event.detail?.status === "error") {
        setPushState({ status: "error", configured: true, message: event.detail.message });
      } else {
        refreshPushState();
      }
    };
    window.addEventListener("push-state-changed", onPushStateChanged);
    return () => window.removeEventListener("push-state-changed", onPushStateChanged);
  }, [refreshPushState]);

  const changePushState = async (enable) => {
    setPushWorking(true);
    try {
      const state = enable ? await enablePushNotifications() : await disablePushNotifications();
      setPushState(state);
      toast.success(enable ? "Browser notifications enabled" : "Browser notifications disabled on this device");
    } catch (error) {
      const message = error.message || "Could not update browser notifications";
      setPushState({ status: "error", configured: true, message });
      toast.error(message, { autoClose: 10000 });
    } finally {
      setPushWorking(false);
    }
  };

  const chooseProfilePicture = (file) => {
    if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      toast.error("Choose a JPG, PNG, or WebP image smaller than 5 MB");
      return;
    }
    setProfilePicture(file || null);
    setPreview(file ? URL.createObjectURL(file) : "");
  };

  useEffect(() => {
    if (profile)
      setForm({
        name: profile.name || "",
        phoneNumber: profile.phoneNumber || "",
        notificationPreferences: {
          email: profile.notificationPreferences?.email !== false,
          inApp: profile.notificationPreferences?.inApp !== false,
        },
      });
  }, [profile]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const directAsset = await uploadDirect(profilePicture, { role: "student", kind: "profilePicture" });
      const payload = {
        name: form.name,
        phoneNumber: form.phoneNumber,
        notificationPreferencesJSON: JSON.stringify(form.notificationPreferences),
        ...(directAsset ? { directAsset } : {}),
      };
      const { data } = await axios.patch(`${import.meta.env.VITE_BASE_URI}/student/profile`, payload);
      if (!data.success) throw new Error(data.msg);
      setProfile(data.student);
      setProfilePicture(null);
      setPreview("");
      toast.success(data.msg);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword)
      return toast.error("New passwords do not match");
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/student/changePassword`,
        {
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        },
      );
      if (!data.success) throw new Error(data.msg);
      toast.success(data.msg);
      await signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not change password");
    }
  };

  const setNotification = (key) => (event) =>
    setForm((prev) => ({
      ...prev,
      notificationPreferences: { ...prev.notificationPreferences, [key]: event.target.checked },
    }));

  return (
    <Page width="5xl">
      <PageHeader
        eyebrow="Account"
        title="Profile and settings"
        description="Keep your recruitment contact details accurate — clubs use them to reach you."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        {/* Identity card */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <Card className="reveal p-6">
            {preview || profile?.profilePicture ? <img src={preview || profile.profilePicture} alt={`${profile?.name || "Student"} profile`} className="h-24 w-24 rounded-full border border-line bg-surface object-cover shadow-sm" /> : <Monogram name={profile?.name || "Student"} size="lg" />}
            <h2 className="display mt-5 text-xl leading-snug">{profile?.name}</h2>
            <p className="mt-1.5 break-all text-sm text-ink-3">{profile?.email}</p>
            <dl className="mt-6 space-y-4 border-t border-line pt-5">
              <Meta label="Enrollment" value={profile?.enrollmentNumber} />
              <Meta label="Programme" value={PROGRAMME_LABELS[profile?.programme] || "Undergraduate"} />
              <Meta label="Branch/discipline" value={profile?.branch} />
              <Meta label="Year" value={profile?.year} />
            </dl>
            <Field id="profilePicture" label="Profile picture" hint="Square JPG, PNG, or WebP. 512 × 512 px works best." className="mt-6">
              <input ref={pictureInput} id="profilePicture" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => chooseProfilePicture(event.target.files[0] || null)} />
              <button type="button" onClick={() => pictureInput.current?.click()} className="w-full rounded-sm border border-dashed border-line-2 bg-paper-2/50 px-4 py-4 text-left transition-colors hover:border-accent hover:bg-accent-tint/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30">
                <span className="block text-sm font-semibold text-ink">{profilePicture ? "Change selected photo" : profile?.profilePicture ? "Replace photo" : "Upload a photo"}</span>
                <span className="mt-1 block truncate text-xs text-ink-3">{profilePicture?.name || "Click to choose an image under 5 MB"}</span>
              </button>
              {profilePicture && <button type="button" className="link mt-2 text-xs font-semibold text-bad" onClick={() => { chooseProfilePicture(null); if (pictureInput.current) pictureInput.current.value = ""; }}>Remove selected photo</button>}
            </Field>
          </Card>
        </aside>

        <div className="space-y-8 lg:col-span-2">
          {/* Personal details */}
          <Card as="form" onSubmit={saveProfile} className="reveal p-6" style={{ "--d": "80ms" }}>
            <h2 className="display text-xl">Personal details</h2>
            <p className="mt-1.5 text-sm text-ink-3">
              Your email and enrollment number are fixed to your institute account.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {DETAIL_FIELDS.map(([key, label]) => (
                <Field key={key} id={key} label={label} required>
                  <Input
                    id={key}
                    value={form[key]}
                    onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                    required
                  />
                </Field>
              ))}
              <Field id="programme" label="Programme"><Input id="programme" value={PROGRAMME_LABELS[profile?.programme] || "Undergraduate"} disabled /></Field>
              <Field id="branch" label="Branch or discipline" hint="Contact an administrator if this is incorrect."><Input id="branch" value={profile?.branch || ""} disabled /></Field>
              <Field id="academicYear" label="Academic year" hint="Advances automatically at the annual June rollover."><Input id="academicYear" value={profile?.year || ""} disabled /></Field>
            </div>

            <fieldset className="mt-7 rounded-sm border border-line bg-paper-2 px-5 py-4">
              <legend className="eyebrow px-1">Recruitment notifications</legend>
              <div className="mt-3 flex flex-wrap gap-6">
                <Check
                  checked={form.notificationPreferences.inApp}
                  onChange={setNotification("inApp")}
                  label="In-app alerts"
                />
                <Check
                  checked={form.notificationPreferences.email}
                  onChange={setNotification("email")}
                  label="Email updates"
                />
              </div>
              <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">Browser push notifications</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-3">
                    {pushState.status === "enabled" && "Enabled on this browser. You can receive updates when Discovr is closed."}
                    {pushState.status === "blocked" && "Blocked by your browser. Allow notifications in the site settings to enable them."}
                    {pushState.status === "unsupported" && "This browser does not support web push notifications."}
                    {pushState.status === "unconfigured" && "Firebase push notifications have not been configured for this deployment yet."}
                    {pushState.status === "error" && pushState.message}
                    {["disabled", "loading"].includes(pushState.status) && "Enable this once per browser to receive recruitment updates while the site is closed."}
                  </p>
                </div>
                {pushState.status === "enabled" ? (
                  <Button type="button" size="sm" variant="secondary" loading={pushWorking} disabled={pushWorking} onClick={() => changePushState(false)}>Disable on this device</Button>
                ) : (
                  <Button type="button" size="sm" variant="secondary" loading={pushWorking} disabled={pushWorking || ["blocked", "unsupported", "unconfigured", "loading"].includes(pushState.status)} onClick={() => changePushState(true)}>Enable browser notifications</Button>
                )}
              </div>
            </fieldset>

            <Button className="mt-7" disabled={saving} loading={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </Card>

          {/* Password */}
          <Card
            as="form"
            onSubmit={changePassword}
            className="reveal p-6"
            style={{ "--d": "140ms" }}
          >
            <h2 className="display text-xl">Change password</h2>
            <p className="mt-1.5 text-sm text-ink-3">
              Changing your password signs you out of every active session.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              {PASSWORD_FIELDS.map(([key, label, autoComplete]) => (
                <Field key={key} id={key} label={label} required>
                  <Input
                    id={key}
                    type="password"
                    minLength={key === "currentPassword" ? 1 : 10}
                    maxLength={key === "currentPassword" ? 128 : 72}
                    autoComplete={autoComplete}
                    value={passwords[key]}
                    onChange={(event) =>
                      setPasswords({ ...passwords, [key]: event.target.value })
                    }
                    required
                  />
                </Field>
              ))}
            </div>

            <Button variant="secondary" className="mt-7">
              Update password
            </Button>
          </Card>
        </div>
      </div>
    </Page>
  );
}
