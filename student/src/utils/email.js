export function isIitrInstituteEmail(value) {
  const normalizedEmail = String(value || "").trim().toLowerCase();
  return /^[a-z]+_[a-z]{1,2}@[a-z]+\.iitr\.ac\.in$/.test(normalizedEmail);
}
