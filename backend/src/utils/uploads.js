const cloudinary = require("../config/cloudinary");

async function destroyCloudinaryAsset(publicId, resourceType = "image") {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType || "image" });
  } catch (error) {
    console.error("Unable to clean up Cloudinary asset:", error?.message || "unknown error");
  }
}

function destroyUploadedFile(file) {
  return destroyCloudinaryAsset(file?.filename, file?.resourceType || "image");
}

function destroyCloudinaryImage(publicId) {
  return destroyCloudinaryAsset(publicId, "image");
}

module.exports = { destroyCloudinaryAsset, destroyCloudinaryImage, destroyUploadedFile };
