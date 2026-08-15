const DEFAULT_CLUB_TYPES = ["cultural", "technical", "departmental", "others"];

function normalizeClubType(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

function normalizedClubTypes(settings) {
  const configured = Array.isArray(settings?.clubTypes) ? settings.clubTypes : [];
  return [...new Set([...DEFAULT_CLUB_TYPES, ...configured].map(normalizeClubType).filter(Boolean))];
}

module.exports = {
  DEFAULT_CLUB_TYPES,
  normalizeClubType,
  normalizedClubTypes,
};
