export function isIitrInstituteEmail(value) {
  const normalizedEmail = String(value || "").trim().toLowerCase();
  const atIndex = normalizedEmail.lastIndexOf("@");
  if (atIndex <= 0) return false;
  const domain = normalizedEmail.slice(atIndex + 1);
  return domain === "iitr.ac.in" || domain.endsWith(".iitr.ac.in");
}
