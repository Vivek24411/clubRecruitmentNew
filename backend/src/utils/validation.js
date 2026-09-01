function isHttpUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(String(value));
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function optionalHttpUrl(value, label = "Link") {
  const clean = String(value || "").trim();
  if (!clean) return "";
  if (!isHttpUrl(clean)) {
    const error = new Error(`${label} must use http or https`);
    error.status = 400;
    throw error;
  }
  return clean;
}

function validDateOrder(start, end) {
  if (!start || !end) return true;
  const startAt = new Date(start);
  const endAt = new Date(end);
  return !Number.isNaN(startAt.getTime())
    && !Number.isNaN(endAt.getTime())
    && startAt < endAt;
}

module.exports = { isHttpUrl, optionalHttpUrl, validDateOrder };
