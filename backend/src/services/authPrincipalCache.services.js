const TTL_MS = Math.max(Number(process.env.AUTH_PRINCIPAL_CACHE_TTL_MS) || 15000, 1000);
const MAX_ENTRIES = Math.max(Number(process.env.AUTH_PRINCIPAL_CACHE_MAX) || 5000, 100);
const entries = new Map();
const pending = new Map();

function cacheKey(role, id, version) {
  return `${role}:${String(id)}:${Number(version) || 0}`;
}

function prune() {
  const now = Date.now();
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(key);
  }
  while (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value);
}

function plainValue(principal) {
  return principal?.toObject
    ? principal.toObject({ depopulate: true, versionKey: false })
    : principal;
}

function putPrincipal(role, principal, version = principal?.tokenVersion) {
  if (!principal?._id) return;
  const key = cacheKey(role, principal._id, version);
  const existing = entries.get(key);
  if (!existing) prune();
  entries.set(key, {
    value: plainValue(principal),
    // Never turn this into a sliding session cache: every account is checked
    // against MongoDB again after the fixed TTL, even under constant traffic.
    expiresAt: existing?.expiresAt > Date.now() ? existing.expiresAt : Date.now() + TTL_MS,
  });
}

async function getPrincipal({ role, id, version, model }) {
  const key = cacheKey(role, id, version);
  const cached = entries.get(key);
  if (cached?.expiresAt > Date.now()) return model.hydrate(cached.value);
  entries.delete(key);

  if (!pending.has(key)) {
    pending.set(key, model.findById(id).select("+tokenVersion").then((principal) => {
      if (principal && principal.status !== "suspended" && principal.tokenVersion === version) {
        putPrincipal(role, principal, version);
      }
      return principal;
    }).finally(() => pending.delete(key)));
  }
  return pending.get(key);
}

function invalidatePrincipal(role, id) {
  const prefix = `${role}:${String(id)}:`;
  for (const key of entries.keys()) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
}

module.exports = { getPrincipal, invalidatePrincipal, putPrincipal };
