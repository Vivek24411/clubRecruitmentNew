const crypto = require("crypto");
const cloudinary = require("../config/cloudinary");

const DEFAULT_CLOUDINARY_IMAGE_LIMIT = 10 * 1024 * 1024;
const CLOUDINARY_FREE_RAW_LIMIT = 10 * 1024 * 1024;
const CLOUDINARY_FREE_VIDEO_LIMIT = 100 * 1024 * 1024;

const UPLOAD_KINDS = Object.freeze({
  profilePicture: {
    folder: "discovr/profile-pictures",
    resourceType: "image",
    maxBytes: 5 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
  },
  clubLogo: {
    folder: "discovr/club-logos",
    resourceType: "image",
    maxBytes: 5 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
  },
  clubBanner: {
    folder: "discovr/club-banners",
    resourceType: "image",
    maxBytes: 20 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
  },
  eventBanner: {
    folder: "discovr/event-banners",
    resourceType: "image",
    maxBytes: 20 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
  },
  sessionThumbnail: {
    folder: "discovr/session-thumbnails",
    resourceType: "image",
    maxBytes: 20 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
  },
  submission: {
    folder: "discovr/submissions",
    resourceType: "auto",
    maxBytes: CLOUDINARY_FREE_VIDEO_LIMIT,
    maxBytesByMimeType: {
      "image/jpeg": DEFAULT_CLOUDINARY_IMAGE_LIMIT,
      "image/png": DEFAULT_CLOUDINARY_IMAGE_LIMIT,
      "image/webp": DEFAULT_CLOUDINARY_IMAGE_LIMIT,
      "application/pdf": CLOUDINARY_FREE_RAW_LIMIT,
      "video/mp4": CLOUDINARY_FREE_VIDEO_LIMIT,
      "video/webm": CLOUDINARY_FREE_VIDEO_LIMIT,
      "video/quicktime": CLOUDINARY_FREE_VIDEO_LIMIT,
    },
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ],
    allowedFormats: ["jpg", "jpeg", "png", "webp", "pdf", "mp4", "webm", "mov"],
  },
});

function actorKey(req) {
  if (req.student?._id) return `student:${req.student._id}`;
  if (req.club?._id) return `club:${req.club._id}`;
  if (req.admin?.email) return `admin:${req.admin.email}`;
  return null;
}

function tokenSecret() {
  const secret = process.env.UPLOAD_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("UPLOAD_TOKEN_SECRET or JWT_SECRET is required");
  return secret;
}

function encodeToken(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", tokenSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function decodeToken(token) {
  const [encoded, provided] = String(token || "").split(".");
  if (!encoded || !provided) throw new Error("Upload authorization is invalid");
  const expected = crypto.createHmac("sha256", tokenSecret()).update(encoded).digest();
  const actual = Buffer.from(provided, "base64url");
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    throw new Error("Upload authorization is invalid");
  }
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Upload authorization has expired");
  }
  return payload;
}

function uploadError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function providerMaxBytes(config) {
  if (config.resourceType !== "image") return config.maxBytes;
  const configured = Number(process.env.CLOUDINARY_MAX_IMAGE_BYTES);
  const accountLimit = Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_CLOUDINARY_IMAGE_LIMIT;
  return Math.min(config.maxBytes, accountLimit);
}

function signDirectUpload(allowedKinds) {
  const allowed = new Set(allowedKinds);
  return (req, res, next) => {
    try {
      const kind = String(req.body.kind || "");
      const config = UPLOAD_KINDS[kind];
      const actor = actorKey(req);
      if (!actor || !config || !allowed.has(kind)) throw uploadError("This upload type is not allowed");
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      if (!cloudName || !apiKey || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error("Cloudinary is not configured");
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const publicId = crypto.randomUUID();
      const params = { allowed_formats: config.allowedFormats, folder: config.folder, public_id: publicId, timestamp };
      const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
      const uploadToken = encodeToken({
        actor,
        kind,
        folder: config.folder,
        publicId,
        exp: timestamp + 15 * 60,
      });

      return res.json({
        success: true,
        upload: {
          cloudName,
          apiKey,
          timestamp,
          signature,
          folder: config.folder,
          publicId,
          resourceType: config.resourceType,
          uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${config.resourceType}/upload`,
          maxBytes: config.maxBytes,
          maxBytesByMimeType: config.maxBytesByMimeType,
          providerMaxBytes: providerMaxBytes(config),
          mimeTypes: config.mimeTypes,
          allowedFormats: config.allowedFormats,
          uploadToken,
        },
      });
    } catch (error) {
      return next(error);
    }
  };
}

function normalizeAsset(req, asset, expectedKind) {
  if (!asset || typeof asset !== "object") throw uploadError("Uploaded file details are invalid");
  const token = decodeToken(asset.uploadToken);
  const config = UPLOAD_KINDS[expectedKind];
  const expectedPublicId = `${config.folder}/${token.publicId}`;
  const bytes = Number(asset.bytes);
  const mimeType = String(asset.mimeType || "").toLowerCase();
  const resourceType = String(asset.resourceType || "");
  const url = String(asset.url || "");
  const version = Number(asset.version);
  const mimeMaxBytes = config.maxBytesByMimeType?.[mimeType] || config.maxBytes;

  if (token.actor !== actorKey(req) || token.kind !== expectedKind || token.folder !== config.folder
    || String(asset.publicId || "") !== expectedPublicId) {
    throw uploadError("Uploaded file authorization does not match this request");
  }
  if (!Number.isFinite(bytes) || bytes < 1 || bytes > mimeMaxBytes || !config.mimeTypes.includes(mimeType)) {
    throw uploadError("Uploaded file type or size is not allowed");
  }
  if (!Number.isInteger(version) || !cloudinary.utils.verify_api_response_signature(
    expectedPublicId,
    version,
    String(asset.responseSignature || ""),
  )) {
    throw uploadError("Cloudinary upload response could not be verified");
  }
  const cloudPrefix = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`;
  if (!url.startsWith(cloudPrefix) || !["image", "video", "raw"].includes(resourceType)) {
    throw uploadError("Uploaded file location is invalid");
  }
  if (config.resourceType === "image" && resourceType !== "image") {
    throw uploadError("Only images are allowed for this upload");
  }

  return {
    path: url,
    filename: expectedPublicId,
    size: bytes,
    format: String(asset.format || "").slice(0, 20),
    resourceType,
    originalName: String(asset.originalName || "upload").slice(0, 255),
    mimetype: mimeType,
  };
}

function attachDirectAsset(kind, bodyField = "directAsset", requestField = "file") {
  return (req, _res, next) => {
    if (req[requestField] || req.body[bodyField] == null) return next();
    try {
      req[requestField] = normalizeAsset(req, req.body[bodyField], kind);
      req.directUploadFiles ||= [];
      req.directUploadFiles.push(req[requestField]);
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

function attachDirectAssets(kind, bodyField = "directAssets", maxFiles = 5) {
  return (req, _res, next) => {
    if ((req.files || []).length || req.body[bodyField] == null) return next();
    try {
      if (!Array.isArray(req.body[bodyField]) || req.body[bodyField].length > maxFiles) {
        throw uploadError(`A maximum of ${maxFiles} files is allowed`);
      }
      req.files = req.body[bodyField].map((asset) => normalizeAsset(req, asset, kind));
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { attachDirectAsset, attachDirectAssets, signDirectUpload, UPLOAD_KINDS };
