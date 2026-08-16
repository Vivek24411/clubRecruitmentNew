const express = require("express");
const studentRouter = require("./src/routes/student.routes");
const adminRouter = require("./src/routes/admin.routes");
const clubRouter = require("./src/routes/club.routes");
const pingRouter = require("./src/routes/ping.routes");
const ensureDBConnection = require("./src/middlewares/dbMiddleware");
const app = express();
const cors = require("cors");
const { requireTrustedOrigin, securityHeaders } = require("./src/middlewares/security");
const rateLimit = require("./src/middlewares/rateLimit");
const { destroyUploadedFile } = require("./src/utils/uploads");

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"];

if (process.env.TRUST_PROXY_HOPS) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS));
} else if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
app.disable("x-powered-by");
app.use(securityHeaders);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "300kb" }));
app.use(express.urlencoded({ extended: false, limit: "300kb", parameterLimit: 100 }));
app.use(requireTrustedOrigin(allowedOrigins));
// Campus networks can place hundreds of students behind one public NAT IP.
// Logged-in sessions therefore receive independent buckets, while the
// anonymous IP ceiling is intentionally broad and protects only abuse spikes.
app.use(rateLimit({ windowMs: 60 * 1000, max: 6000, keyPrefix: "api", keyGenerator: rateLimit.sessionOrIp }));
app.use("/ping", pingRouter);
app.use(ensureDBConnection);

app.use("/student", studentRouter);
app.use("/admin", adminRouter);
app.use("/club", clubRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, msg: "Endpoint not found" });
});

app.use(async (error, req, res, next) => {
  if (res.headersSent) return next(error);
  const uploads = [req.file, ...(req.files || []), ...(req.directUploadFiles || [])].filter(Boolean);
  await Promise.all([...new Map(uploads.map((file) => [file.filename, file])).values()].map(destroyUploadedFile));
  const isCorsError = /CORS policy/i.test(error?.message || "");
  const isUploadError = error?.name === "MulterError" || /(images are allowed|PDF|video|file too large)/i.test(error?.message || "");
  const isValidationError = ["ValidationError", "CastError"].includes(error?.name);
  const isDuplicateError = error?.code === 11000;
  const status = error?.status || (isCorsError ? 403 : isUploadError || isValidationError ? 400 : isDuplicateError ? 409 : 500);
  if (status === 500) console.error("Unhandled request error:", error);
  return res.status(status).json({
    success: false,
    msg: isCorsError
      ? "Origin is not allowed"
      : isUploadError
        ? error.message
        : isValidationError
          ? "Invalid request data"
          : isDuplicateError
            ? "A record with those details already exists"
            : "Something went wrong. Please try again.",
  });
});

module.exports = app;
