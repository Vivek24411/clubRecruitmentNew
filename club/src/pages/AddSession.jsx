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

export default function AddSession() {
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [capacity, setCapacity] = useState("");
  const [status, setStatus] = useState("draft");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URI}/club/addSession`, {
        title,
        shortDescription,
        date,
        time,
        duration,
        longDescription,
        venue,
        capacity: capacity || null,
        status,
      });

      if (response.data.success) {
        toast.success(response.data.msg);
        setTitle("");
        setShortDescription("");
        setDate("");
        setTime("");
        setDuration("");
        setLongDescription("");
        setVenue("");
        setCapacity("");
        setStatus("draft");
      } else {
        toast.error(response.data.msg);
      }
    } catch (error) {
      console.error("Error adding session:", error);
      toast.error(error.response?.data?.msg || "Failed to create session");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Page width="5xl">
      <PageHeader
        eyebrow="New session"
        title="Schedule an information session"
        description="Give students a chance to meet your club and understand how selection works."
      />

      <form onSubmit={handleSubmit} className="mt-10 space-y-6">
        {/* About ---------------------------------------------------------- */}
        <Card className="reveal p-6">
          <h2 className="display text-xl">About</h2>
          <div className="mt-6 space-y-5">
            {/* This was previously a date input by mistake — it is free text. */}
            <Field label="Session title" id="title" required>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                placeholder="e.g. Intro to Design at IITR"
              />
            </Field>

            <Field
              label="Short description"
              id="shortDescription"
              required
              hint="One line. Appears in listings."
            >
              <Input
                id="shortDescription"
                value={shortDescription}
                onChange={(event) => setShortDescription(event.target.value)}
                required
                placeholder="Brief description"
              />
            </Field>

            <Field
              label="Detailed description"
              id="longDescription"
              required
              hint="Include any special instructions, requirements, or what attendees should expect."
            >
              <Textarea
                id="longDescription"
                rows={6}
                value={longDescription}
                onChange={(event) => setLongDescription(event.target.value)}
                required
                placeholder="Provide detailed information about this session"
              />
            </Field>
          </div>
        </Card>

        {/* Schedule ------------------------------------------------------- */}
        <Card className="reveal p-6" style={{ "--d": "80ms" }}>
          <h2 className="display text-xl">Schedule and venue</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Date" id="date" required>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </Field>

            <Field label="Start time" id="time" required>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                required
              />
            </Field>

            <Field label="Duration" id="duration" required hint="In minutes.">
              <Input
                id="duration"
                type="number"
                min="1"
                className="tabular"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                required
                placeholder="60"
              />
            </Field>

            <Field label="Capacity" id="capacity" hint="Blank means unlimited.">
              <Input
                id="capacity"
                type="number"
                min="1"
                className="tabular"
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
                placeholder="Unlimited"
              />
            </Field>

            <Field label="Venue" id="venue" required className="sm:col-span-2">
              <Input
                id="venue"
                value={venue}
                onChange={(event) => setVenue(event.target.value)}
                required
                placeholder="e.g. LHC 101"
              />
            </Field>
          </div>
        </Card>

        {/* Publish -------------------------------------------------------- */}
        <Card className="reveal p-6" style={{ "--d": "150ms" }}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <Field
              label="Visibility"
              id="status"
              className="sm:w-56"
              hint="Published sessions are visible to every student."
            >
              <Select
                id="status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="draft">Save as draft</option>
                <option value="published">Publish now</option>
              </Select>
            </Field>

            <Button type="submit" size="lg" loading={isLoading}>
              {isLoading
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
