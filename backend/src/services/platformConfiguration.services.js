const DEFAULT_CLUB_TYPES = ["cultural", "technical", "departmental", "others"];
const platformSettingsModel = require("../models/platformSettings.model");

const CACHE_TTL_MS = Math.max(Number(process.env.SETTINGS_CACHE_TTL_MS) || 60000, 5000);
let cachedSettings = null;
let cacheExpiresAt = 0;
let pendingSettings = null;

async function getPlatformSettingsCached() {
  if (cachedSettings && cacheExpiresAt > Date.now()) return cachedSettings;
  if (!pendingSettings) {
    pendingSettings = platformSettingsModel.findOne({ key: "global" }).then((settings) => {
      cachedSettings = settings;
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return settings;
    }).finally(() => {
      pendingSettings = null;
    });
  }
  return pendingSettings;
}

function invalidatePlatformSettingsCache() {
  cachedSettings = null;
  cacheExpiresAt = 0;
}

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
  getPlatformSettingsCached,
  invalidatePlatformSettingsCache,
  normalizeClubType,
  normalizedClubTypes,
};
