import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { toast } from "react-toastify";
import { Button, Modal } from "./ui";

function publicStudentUrl(path) {
  const configured = String(import.meta.env.VITE_STUDENT_APP_ORIGIN || "").replace(/\/$/, "");
  if (!configured) return null;
  try {
    const origin = new URL(configured);
    if (!["http:", "https:"].includes(origin.protocol) || origin.origin !== configured) return null;
    return new URL(path, origin).href;
  } catch {
    return null;
  }
}

function downloadName(title, kind) {
  const slug = String(title || kind)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${slug || kind}-${kind}-qr.png`;
}

export default function ShareQrModal({ open, onClose, kind, itemId, title, published = true }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");
  const publicUrl = useMemo(
    () => publicStudentUrl(`/${kind}/${itemId}`),
    [itemId, kind],
  );

  useEffect(() => {
    let cancelled = false;
    if (!open) return undefined;
    if (!publicUrl) {
      setQrDataUrl("");
      setError("The public student-app address is not configured for this club build.");
      return undefined;
    }
    setError("");
    QRCode.toDataURL(publicUrl, {
      errorCorrectionLevel: "H",
      margin: 3,
      width: 1200,
      color: { dark: "#111612", light: "#ffffff" },
    })
      .then((value) => {
        if (!cancelled) setQrDataUrl(value);
      })
      .catch(() => {
        if (!cancelled) setError("The QR image could not be generated in this browser.");
      });
    return () => { cancelled = true; };
  }, [open, publicUrl]);

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Public link copied");
    } catch {
      toast.error("Could not copy the link. Select it below and copy manually.");
    }
  };

  const download = () => {
    if (!qrDataUrl) return;
    const anchor = document.createElement("a");
    anchor.href = qrDataUrl;
    anchor.download = downloadName(title, kind);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Share ${kind}`}
      description="This QR opens the exact public student page. Download the high-resolution PNG for posters, stories, and social posts."
    >
      {error ? (
        <>
          <div className="rounded-sm border border-bad/30 bg-bad-tint px-4 py-3 text-sm text-bad">{error}</div>
          <Button type="button" variant="secondary" className="mt-4" onClick={onClose}>Close</Button>
        </>
      ) : (
        <>
          {!published && (
            <div className="mb-4 rounded-sm border border-warn/30 bg-warn-tint px-4 py-3 text-sm text-warn">
              This {kind} is not published yet. The QR will start working for students after you publish it.
            </div>
          )}
          <div className="mx-auto aspect-square w-full max-w-[19rem] rounded-md border border-line bg-white p-3 shadow-sm">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR code for ${title}`} className="h-full w-full" />
            ) : (
              <div className="grid h-full place-items-center text-sm text-ink-3">Generating QR…</div>
            )}
          </div>
          <label className="label mt-5" htmlFor={`${kind}-public-url`}>Public destination</label>
          <input
            id={`${kind}-public-url`}
            className="input font-mono text-xs"
            value={publicUrl || ""}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" onClick={download} disabled={!qrDataUrl}>Download PNG</Button>
            <Button type="button" variant="secondary" onClick={copyLink}>Copy link</Button>
            <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
