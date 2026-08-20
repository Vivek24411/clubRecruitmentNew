function exactHttpOrigin(value) {
  try {
    const origin = String(value || "").trim();
    const parsed = new URL(origin);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin !== origin) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isLoopbackHostname(hostname) {
  const normalized = String(hostname || "")
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
  return normalized === "localhost"
    || normalized.endsWith(".localhost")
    || normalized === "::1"
    || /^127(?:\.\d{1,3}){3}$/.test(normalized);
}

function isPublicHttpsOrigin(value) {
  const parsed = exactHttpOrigin(value);
  return Boolean(parsed && parsed.protocol === "https:" && !isLoopbackHostname(parsed.hostname));
}

function buildPublicAppUrl(path, origin) {
  const safePath = String(path || "");
  if (!safePath.startsWith("/") || safePath.startsWith("//") || !isPublicHttpsOrigin(origin)) return null;
  return new URL(safePath, origin).href;
}

module.exports = {
  buildPublicAppUrl,
  exactHttpOrigin,
  isLoopbackHostname,
  isPublicHttpsOrigin,
};
