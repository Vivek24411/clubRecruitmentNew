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
  const nativeStudentAuthPaths = new Set([
    "/student/sendOtp",
    "/student/verifyOtp",
    "/student/register",
    "/student/login",
    "/student/forgotPassword",
  ]);

  return (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

    const origin = req.headers.origin;
    const hasBearer = req.headers.authorization?.startsWith("Bearer ");
    // Native fetch does not carry a browser Origin. Limit anonymous native
    // mutations to the student authentication endpoints; authenticated app
    // requests must continue to present a bearer token.
    const isNativeStudentAuth = !origin
      && req.headers["x-discovr-client"] === "mobile"
      && nativeStudentAuthPaths.has(req.path);
    if (!origin && (hasBearer || isNativeStudentAuth || process.env.NODE_ENV !== "production")) return next();
    if (origin && allowedOrigins.includes(origin)) return next();

    return res.status(403).json({ success: false, msg: "Untrusted request origin" });
  };
}

module.exports = { requireTrustedOrigin, securityHeaders };
