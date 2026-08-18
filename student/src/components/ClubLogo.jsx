import { useEffect, useState } from "react";
import { Monogram } from "./ui";

export default function ClubLogo({ club }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [club?.clubLogo]);

  if (!club?.clubLogo || failed) {
    return <Monogram name={club?.name || "Club"} size="sm" />;
  }

  return (
    <img
      src={club.clubLogo}
      alt={`${club.name || "Club"} logo`}
      className="h-10 w-10 rounded-md border border-line bg-white object-contain p-1"
      onError={() => setFailed(true)}
    />
  );
}
