import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Button,
  Card,
  Field,
  Input,
  Page,
  PageHeader,
  Select,
  Textarea,
} from "../components/ui";

const ROUND_SUGGESTIONS = ["Test", "Submission", "Interview", "Group Discussion", "Task"];

export default function AddEvent() {
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [registerationDeadline, setRegisterationDeadline] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(0);
  const [ContactInfo, setContactInfo] = useState([]);
  const [eligibility, setEligibility] = useState("");
  const [numberOfRounds, setNumberOfRounds] = useState(0);
  const [roundDetails, setRoundDetails] = useState([]);
  const [eventBanner, setEventBanner] = useState(null);
  const [eventBannerPreview, setEventBannerPreview] = useState(null);
  const [registrationType, setRegistrationType] = useState("team");
  const [minTeamSize, setMinTeamSize] = useState(1);
  const [status, setStatus] = useState("draft");
  const [submitting, setSubmitting] = useState(false);

  function handleImageInput(event) {
    const file = event.target.files[0];
    if (!file) {
      setEventBanner(null);
      setEventBannerPreview(null);
      return;
    }
    setEventBanner(file);
    const reader = new FileReader();
    reader.onload = (loaded) => setEventBannerPreview(loaded.target.result);
    reader.readAsDataURL(file);
  }

  const setRound = (index, changes) =>
    setRoundDetails((previous) => {
      const next = [...previous];
      next[index] = { Round: index + 1, ...next[index], ...changes };
      return next;
    });

  const resetForm = () => {
    setTitle("");
    setShortDescription("");
    setLongDescription("");
    setRegisterationDeadline("");
    setMaxParticipants(0);
    setContactInfo([]);
    setEligibility("");
    setNumberOfRounds(0);
    setRoundDetails([]);
    setEventBanner(null);
    setEventBannerPreview(null);
    setRegistrationType("team");
    setMinTeamSize(1);
    setStatus("draft");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!eventBanner) {
      toast.error("Please upload an event banner");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(eventBanner.type)) {
      toast.error("Please upload a valid image file (JPG, PNG, or WebP)");
      return;
    }
    if (eventBanner.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }
    if (numberOfRounds > 0 && numberOfRounds !== roundDetails.length) {
      toast.error("Please fill details for all rounds");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("eventBanner", eventBanner);
      formData.append("title", title);
      formData.append("shortDescription", shortDescription);
      formData.append("longDescription", longDescription);
      formData.append("registerationDeadline", registerationDeadline);
      formData.append("maxParticipants", maxParticipants);
      formData.append("registrationType", registrationType);
      formData.append("minTeamSize", minTeamSize);
      formData.append("maxTeamSize", registrationType === "individual" ? 1 : maxParticipants);
      formData.append("status", status);
      if (ContactInfo && ContactInfo.length > 0) {
        ContactInfo.forEach((contact, index) => {
          formData.append(`ContactInfo[${index}]`, contact);
        });
      }
      formData.append("eligibility", eligibility || "");
      formData.append("numberOfRounds", numberOfRounds);
      if (roundDetails && roundDetails.length > 0) {
        formData.append("roundDetailsJSON", JSON.stringify(roundDetails));
      }

      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/club/addEvent`,
        formData,
      );

      if (response.data.success) {
        toast.success("Event added successfully");
        resetForm();
      } else {
        toast.error(response.data.msg || "Failed to add event");
      }
    } catch (error) {
      console.error("Error adding event:", error);
      toast.error(error.response?.data?.msg || "An error occurred while adding the event");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page width="5xl">
      <PageHeader
        eyebrow="New pipeline"
        title="Create a recruitment event"
        description="Save it as a draft while you work, then publish when you're ready for applications."
      />

      <form onSubmit={handleSubmit} className="mt-10 space-y-6">
        {/* Basics --------------------------------------------------------- */}
        <Card className="reveal p-6">
          <h2 className="display text-xl">Basics</h2>
          <div className="mt-6 space-y-5">
            <Field label="Event title" id="title" required>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                placeholder="e.g. Autumn Developer Inductions"
              />
            </Field>

            <Field
              label="Short description"
              id="shortDescription"
              required
              hint="One line. This is what students see on event cards."
            >
              <Input
                id="shortDescription"
                value={shortDescription}
                onChange={(event) => setShortDescription(event.target.value)}
                required
                placeholder="A brief summary of the event"
              />
            </Field>

            <Field label="Full description" id="longDescription" required>
              <Textarea
                id="longDescription"
                rows={6}
                value={longDescription}
                onChange={(event) => setLongDescription(event.target.value)}
                required
                placeholder="What the role involves, what you look for, rules, and anything else applicants should know."
              />
            </Field>
          </div>
        </Card>

        {/* Banner --------------------------------------------------------- */}
        <Card className="reveal p-6" style={{ "--d": "70ms" }}>
          <h2 className="display text-xl">
            Banner <span className="text-accent">*</span>
          </h2>
          <p className="mt-1.5 text-sm text-ink-3">JPG, PNG, or WebP under 5&nbsp;MB.</p>

          <Field label="Upload image" id="banner" className="mt-5">
            <input
              id="banner"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageInput}
              required
              className="block w-full text-sm text-ink-2 file:mr-4 file:cursor-pointer file:rounded-sm file:border file:border-line-2 file:bg-surface file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink hover:file:bg-paper-2"
            />
          </Field>

          {eventBannerPreview && (
            <figure className="animate-scale-in mt-5">
              <img
                src={eventBannerPreview}
                alt="Banner preview"
                className="aspect-[21/7] w-full rounded-sm border border-line object-cover"
              />
              <figcaption className="mt-2 text-xs text-ink-3">
                Preview · {eventBanner?.name} ·{" "}
                {eventBanner ? (eventBanner.size / 1024 / 1024).toFixed(2) : 0} MB
              </figcaption>
            </figure>
          )}
        </Card>

        {/* Registration --------------------------------------------------- */}
        <Card className="reveal p-6" style={{ "--d": "140ms" }}>
          <h2 className="display text-xl">Registration</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Deadline" id="deadline" required>
              <Input
                id="deadline"
                type="date"
                value={registerationDeadline}
                onChange={(event) => setRegisterationDeadline(event.target.value)}
                required
              />
            </Field>

            <Field label="Max participants" id="maxParticipants" required>
              <Input
                id="maxParticipants"
                type="number"
                min={1}
                className="tabular"
                value={maxParticipants}
                onChange={(event) => setMaxParticipants(Number(event.target.value))}
                required
                placeholder="e.g. 100"
              />
            </Field>

            <Field label="Registration type" id="registrationType">
              <Select
                id="registrationType"
                value={registrationType}
                onChange={(event) => setRegistrationType(event.target.value)}
              >
                <option value="individual">Individual</option>
                <option value="team">Team</option>
                <option value="optional_team">Optional team</option>
              </Select>
            </Field>

            <Field
              label="Minimum team size"
              id="minTeamSize"
              hint={registrationType === "individual" ? "Fixed at 1 for individual events." : undefined}
            >
              <Input
                id="minTeamSize"
                type="number"
                min="1"
                className="tabular disabled:bg-paper-2 disabled:text-ink-4"
                disabled={registrationType === "individual"}
                value={registrationType === "individual" ? 1 : minTeamSize}
                onChange={(event) => setMinTeamSize(Number(event.target.value))}
              />
            </Field>

            <Field label="Eligibility" id="eligibility">
              <Input
                id="eligibility"
                value={eligibility}
                onChange={(event) => setEligibility(event.target.value)}
                placeholder="e.g. First and second year only"
              />
            </Field>

            <Field
              label="Contact info"
              id="contact"
              hint="Comma separated — phone numbers or emails."
            >
              <Input
                id="contact"
                value={ContactInfo.join(", ")}
                onChange={(event) =>
                  setContactInfo(event.target.value.split(",").map((value) => value.trim()))
                }
                placeholder="98765 43210, lead@club.iitr.ac.in"
              />
            </Field>
          </div>
        </Card>

        {/* Rounds --------------------------------------------------------- */}
        <Card className="reveal p-6" style={{ "--d": "200ms" }}>
          <h2 className="display text-xl">Selection rounds</h2>
          <p className="mt-1.5 text-sm text-ink-3">
            Set how many rounds you run, then describe each one.
          </p>

          <Field label="Number of rounds" id="numberOfRounds" className="mt-6 max-w-40">
            <Input
              id="numberOfRounds"
              type="number"
              min={0}
              className="tabular"
              value={numberOfRounds}
              onChange={(event) => setNumberOfRounds(Number(event.target.value))}
              placeholder="e.g. 3"
            />
          </Field>

          <datalist id="round-types">
            {ROUND_SUGGESTIONS.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>

          {numberOfRounds > 0 && (
            <ol className="relative mt-8 space-y-6 pl-8">
              <span
                className="absolute bottom-3 left-[0.6875rem] top-3 w-px bg-line"
                aria-hidden="true"
              />
              {Array.from({ length: numberOfRounds }, (_, index) => (
                <li key={index} className="reveal relative" style={{ "--d": `${index * 60}ms` }}>
                  <span className="absolute -left-8 grid h-6 w-6 place-items-center rounded-full border border-line bg-surface text-[0.6875rem] font-semibold text-ink-2">
                    {index + 1}
                  </span>

                  <Field label={`Round ${index + 1} type`} id={`round-${index}`}>
                    <Input
                      id={`round-${index}`}
                      list="round-types"
                      value={roundDetails[index]?.Type || ""}
                      onChange={(event) => setRound(index, { Type: event.target.value })}
                      placeholder="Test, Submission, Interview…"
                    />
                  </Field>

                  {roundDetails[index]?.Type === "Test" && (
                    <Field label="Test date" id={`test-${index}`} className="mt-4">
                      <Input
                        id={`test-${index}`}
                        type="date"
                        value={roundDetails[index]?.TestDate || ""}
                        onChange={(event) => setRound(index, { TestDate: event.target.value })}
                      />
                    </Field>
                  )}

                  {roundDetails[index]?.Type === "Submission" && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <Field label="Submission deadline" id={`sub-${index}`}>
                        <Input
                          id={`sub-${index}`}
                          type="date"
                          value={roundDetails[index]?.SubmissionDeadline || ""}
                          onChange={(event) =>
                            setRound(index, { SubmissionDeadline: event.target.value })
                          }
                        />
                      </Field>
                      <Field label="Google Form link" id={`form-${index}`}>
                        <Input
                          id={`form-${index}`}
                          type="url"
                          value={roundDetails[index]?.GoogleFormLink || ""}
                          onChange={(event) =>
                            setRound(index, { GoogleFormLink: event.target.value })
                          }
                          placeholder="https://forms.gle/…"
                        />
                      </Field>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* Publish -------------------------------------------------------- */}
        <Card className="reveal p-6" style={{ "--d": "260ms" }}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <Field label="Visibility" id="status" className="sm:w-56">
              <Select
                id="status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="draft">Save as draft</option>
                <option value="published">Publish now</option>
              </Select>
            </Field>

            <Button type="submit" size="lg" loading={submitting}>
              {submitting
                ? "Creating…"
                : status === "published"
                  ? "Create and publish"
                  : "Create draft"}
            </Button>
          </div>
        </Card>
      </form>
    </Page>
  );
}
