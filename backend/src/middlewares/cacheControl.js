function appendVary(res, value) {
  const existing = String(res.get("Vary") || "").split(",").map((item) => item.trim()).filter(Boolean);
  if (!existing.includes(value)) existing.push(value);
  res.set("Vary", existing.join(", "));
}

function publicCache(seconds = 60) {
  return (_req, res, next) => {
    res.set("Cache-Control", `public, max-age=15, s-maxage=${seconds}, stale-while-revalidate=${seconds * 5}`);
    appendVary(res, "Origin");
    next();
  };
}

function catalogueCache(seconds = 60) {
  return (req, res, next) => {
    if (req.student) {
      res.set("Cache-Control", "private, no-store");
      appendVary(res, "Cookie");
      appendVary(res, "Authorization");
    } else {
      res.set("Cache-Control", `public, max-age=15, s-maxage=${seconds}, stale-while-revalidate=${seconds * 5}`);
      appendVary(res, "Origin");
    }
    next();
  };
}

module.exports = { catalogueCache, publicCache };
