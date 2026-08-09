export function isIitrInstituteEmail(value) {
  const normalizedEmail = String(value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+$/.test(normalizedEmail)) return false;
  const domain = normalizedEmail.slice(normalizedEmail.lastIndexOf("@") + 1);
  return domain === "iitr.ac.in" || domain.endsWith(".iitr.ac.in");
}
