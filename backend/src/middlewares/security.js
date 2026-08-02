function securityHeaders(req, res, next) {
  res.set({
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cache-Control": "no-store",
  });

  if (process.env.NODE_ENV === "production") {
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

function requireTrustedOrigin(allowedOrigins) {
  return (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

    const origin = req.headers.origin;
    const hasBearer = req.headers.authorization?.startsWith("Bearer ");
    if (!origin && (hasBearer || process.env.NODE_ENV !== "production")) return next();
    if (origin && allowedOrigins.includes(origin)) return next();

    return res.status(403).json({ success: false, msg: "Untrusted request origin" });
  };
}

module.exports = { requireTrustedOrigin, securityHeaders };
