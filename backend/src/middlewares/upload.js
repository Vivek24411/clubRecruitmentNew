const multer = require("multer");
const cloudinary = require("../config/cloudinary");

function cloudinaryStorage({ folder, resourceType = "image", transformImages = false }) {
  return {
    _handleFile(req, file, callback) {
      const options = {
        folder: typeof folder === "function" ? folder(file) : folder,
        resource_type: resourceType,
        use_filename: false,
        unique_filename: true,
      };
      if (transformImages && file.mimetype.startsWith("image/")) {
        options.transformation = [{ width: 1800, height: 1200, crop: "limit", quality: "auto" }];
      }
      const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error) return callback(error);
        return callback(null, {
          path: result.secure_url,
          filename: result.public_id,
          size: result.bytes,
          format: result.format,
          resourceType: result.resource_type || resourceType,
          originalName: file.originalname,
          mimetype: file.mimetype,
        });
      });
      file.stream.pipe(uploadStream);
    },
    _removeFile(req, file, callback) {
      if (!file.filename) return callback(null);
      cloudinary.uploader.destroy(file.filename, { resource_type: file.resourceType || resourceType })
        .then(() => callback(null))
        .catch(callback);
    },
  };
}

const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const imageStorage = cloudinaryStorage({
  folder: (file) => ({
    clubLogo: "discovr/club-logos",
    eventBanner: "discovr/event-banners",
    sessionThumbnail: "discovr/session-thumbnails",
    profilePicture: "discovr/profile-pictures",
  }[file.fieldname] || "discovr/images"),
  resourceType: "image",
  transformImages: true,
});

const imageFileFilter = (req, file, callback) => {
  const allowed = imageMimeTypes.has(file.mimetype);
  callback(allowed ? null : new Error("Only JPG, PNG, and WebP images are allowed"), allowed);
};

const upload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 80 },
  fileFilter: imageFileFilter,
});

// Event banners and session thumbnails may contain print-quality artwork, so
// they get a larger limit without also increasing profile-picture/logo limits.
const bannerUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: 1, fields: 80 },
  fileFilter: imageFileFilter,
});

const submissionMimeTypes = new Set([
  ...imageMimeTypes,
  "application/pdf",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const submissionUpload = multer({
  storage: cloudinaryStorage({
    folder: "discovr/submissions",
    resourceType: "auto",
    transformImages: true,
  }),
  // Compatibility path for older clients that send files through the API.
  // Current clients upload directly to Cloudinary and can use its 100 MB
  // video limit without passing a large request through Express/nginx.
  limits: { fileSize: 50 * 1024 * 1024, files: 5, fields: 30 },
  fileFilter: (req, file, callback) => {
    const allowed = submissionMimeTypes.has(file.mimetype);
    callback(allowed ? null : new Error("Only images, PDFs, MP4, WebM, and MOV videos are allowed"), allowed);
  },
});

upload.submissionUpload = submissionUpload;
upload.bannerUpload = bannerUpload;
module.exports = upload;
