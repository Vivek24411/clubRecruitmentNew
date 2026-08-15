import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Button, Card, Field, Input, Page, PageHeader, Select } from "../components/ui";

export default function AddClub() {
  const [name, setName] = useState("");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [sameEmail, setSameEmail] = useState(true);
  const [category, setCategory] = useState("technical");
  const [clubTypes, setClubTypes] = useState(["cultural", "technical", "departmental", "others"]);
  const [isLoading, setIsLoading] = useState(false);
  const [clubLogo, setClubLogo] = useState(null);
  const [clubLogoPreview, setClubLogoPreview] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_BASE_URI}/admin/settings`)
      .then(({ data }) => data.success && setClubTypes(data.settings.clubTypes || clubTypes))
      .catch(() => toast.error("Could not load club types"));
    // The built-in list is a safe fallback when settings are unavailable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function uploadClubLogo(event) {
    const file = event.target.files[0];
    if (!file) {
      setClubLogo(null);
      setClubLogoPreview(null);
      return;
    }
    setClubLogo(file);
    const reader = new FileReader();
    reader.onloadend = () => setClubLogoPreview(reader.result);
    reader.readAsDataURL(file);
  }

  function clearLogo() {
    setClubLogo(null);
    setClubLogoPreview(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  const handleAddClub = async (event) => {
    event.preventDefault();

    if (!name || !userName || !password || !accountEmail) {
      toast.warning("Please fill all fields");
      return;
    }
    if (password.length < 10) {
      toast.warning("Password must be at least 10 characters long");
      return;
    }
    if (clubLogo && !["image/jpeg", "image/png", "image/webp"].includes(clubLogo.type)) {
      toast.warning("Choose a JPG, PNG, or WebP image");
      return;
    }
    if (clubLogo && clubLogo.size > 5 * 1024 * 1024) {
      toast.warning("Club logo must be smaller than 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("userName", userName);
    formData.append("password", password);
    formData.append("accountEmail", accountEmail);
    formData.append("contactEmail", sameEmail ? accountEmail : contactEmail);
    formData.append("useAccountEmailForContact", String(sameEmail));
    formData.append("category", category);
    if (clubLogo) formData.append("clubLogo", clubLogo);

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/admin/addClub`,
        formData,
      );
      if (response.data.success) {
        toast.success(response.data.msg);
        setName("");
        setUserName("");
        setPassword("");
        setAccountEmail("");
        setContactEmail("");
        setSameEmail(true);
        setCategory("technical");
        clearLogo();
      } else {
        toast.error(response.data.msg);
      }
    } catch (error) {
      console.error("Error adding club:", error);
      toast.error(error.response?.data?.msg || "Failed to add club");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Page width="5xl">
      <PageHeader
        eyebrow="Provisioning"
        title="Add a club"
        description="Create a club account. Its officers will sign in with these credentials to run their own recruitment."
      />

      <form onSubmit={handleAddClub} className="mt-10 space-y-6">
        {/* Credentials ----------------------------------------------------- */}
        <Card className="reveal p-6">
          <h2 className="display text-xl">Account</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Club name" id="clubName" required className="sm:col-span-2">
              <Input
                id="clubName"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Society for Data Science"
                required
              />
            </Field>

            <Field label="Username" id="username" required hint="Used to sign in.">
              <Input
                id="username"
                value={userName}
                onChange={(event) => setUserName(event.target.value)}
                placeholder="e.g. sdslabs"
                autoComplete="off"
                required
              />
            </Field>

            <Field
              label="Password"
              id="password"
              required
              hint="At least 10 characters. Share it with the club securely."
            >
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter a secure password"
                autoComplete="new-password"
                minLength={10}
                maxLength={72}
                required
              />
            </Field>
            <Field label="Account email" id="accountEmail" required hint="Private. Used for OTP password recovery.">
              <Input id="accountEmail" type="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} autoComplete="email" required />
            </Field>
            <Field label="Club category" id="category" required>
              <Select id="category" value={category} onChange={(event) => setCategory(event.target.value)}>
                {clubTypes.map((type) => <option key={type} value={type}>{type.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>)}
              </Select>
            </Field>
            <label className="flex items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" checked={sameEmail} onChange={(event) => setSameEmail(event.target.checked)} />Use the account email as the public contact email</label>
            {!sameEmail && <Field label="Public contact email" id="contactEmail" className="sm:col-span-2" required><Input id="contactEmail" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} required /></Field>}
          </div>
        </Card>

        {/* Logo ------------------------------------------------------------ */}
        <Card className="reveal p-6" style={{ "--d": "80ms" }}>
          <h2 className="display text-xl">Logo</h2>
          <p className="mt-1.5 text-sm text-ink-3">Optional. PNG, JPG, or WebP under 5&nbsp;MB.</p>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex-1 rounded-sm border border-dashed border-line-2 px-6 py-10 text-center transition-colors duration-300 hover:border-accent hover:bg-accent-tint/30"
            >
              <svg
                className="mx-auto h-9 w-9 text-ink-4"
                viewBox="0 0 36 36"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M18 24V11m0 0l-5 5m5-5l5 5M6 24v3a3 3 0 003 3h18a3 3 0 003-3v-3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="mt-3 block text-sm font-semibold text-accent">
                Upload a club logo
              </span>
              <span className="mt-1 block text-xs text-ink-3">PNG, JPG, or WebP · max 5 MB</span>
            </button>

            <input
              ref={fileInput}
              id="clubLogo"
              name="clubLogo"
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/webp"
              onChange={uploadClubLogo}
            />

            {clubLogoPreview && (
              <figure className="animate-scale-in flex-none text-center">
                <div className="relative h-32 w-32 overflow-hidden rounded-md border border-line">
                  <img
                    src={clubLogoPreview}
                    alt="Club logo preview"
                    className="h-full w-full bg-surface object-contain p-1"
                  />
                  <button
                    type="button"
                    onClick={clearLogo}
                    title="Remove image"
                    className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink/80 text-xs text-white transition-colors duration-200 hover:bg-bad"
                  >
                    ✕
                  </button>
                </div>
                <figcaption className="mt-2 text-xs text-ink-3">Preview</figcaption>
              </figure>
            )}
          </div>
        </Card>

        {/* Note ------------------------------------------------------------ */}
        <div className="reveal rounded-sm border-l-2 border-accent bg-accent-tint/40 px-5 py-4">
          <p className="eyebrow eyebrow-accent">Before you create</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
            Once created, the club can publish events and sessions, review applications, and send
            decisions. You can suspend the account or reset its password at any time from the Clubs
            page.
          </p>
        </div>

        <Button type="submit" size="lg" loading={isLoading}>
          {isLoading ? "Creating…" : "Add club"}
        </Button>
      </form>
    </Page>
  );
}
