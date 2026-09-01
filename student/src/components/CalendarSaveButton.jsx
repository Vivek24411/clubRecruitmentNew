import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Button } from "./ui";

export default function CalendarSaveButton({ sourceType, sourceId, signedIn, onSignIn, className = "" }) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!signedIn || !sourceId) return;
    let active = true;
    axios.get(`${import.meta.env.VITE_BASE_URI}/student/calendar/status`, { params: { sourceType, sourceId } })
      .then(({ data }) => { if (active) setSaved(Boolean(data.saved)); })
      .catch(() => {});
    return () => { active = false; };
  }, [signedIn, sourceId, sourceType]);

  const toggle = async () => {
    if (!signedIn) {
      onSignIn?.();
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios({
        method: saved ? "delete" : "put",
        url: `${import.meta.env.VITE_BASE_URI}/student/calendar/items`,
        data: { sourceType, sourceId },
      });
      if (!data.success) throw new Error(data.msg);
      setSaved(Boolean(data.saved));
      toast.success(data.msg);
    } catch (error) {
      toast.error(error.response?.data?.msg || error.message || "Could not update your calendar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" variant={saved ? "primary" : "secondary"} loading={loading} onClick={toggle} className={className}>
      <span aria-hidden="true">{saved ? "✓" : "+"}</span> {saved ? "In your calendar" : "Add to calendar"}
    </Button>
  );
}
