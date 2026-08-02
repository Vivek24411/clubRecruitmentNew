const cloudinary = require("../config/cloudinary");

async function destroyCloudinaryImage(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (error) {
    console.error("Unable to clean up Cloudinary image:", error?.message || "unknown error");
  }
}

function destroyUploadedFile(file) {
  return destroyCloudinaryImage(file?.filename);
}

module.exports = { destroyCloudinaryImage, destroyUploadedFile };
