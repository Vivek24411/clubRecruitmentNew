const cloudinary = require("../config/cloudinary");

async function destroyCloudinaryAsset(publicId, resourceType = "image", deliveryType = "upload") {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType || "image",
      type: deliveryType || "upload",
    });
  } catch (error) {
    console.error("Unable to clean up Cloudinary asset:", error?.message || "unknown error");
  }
}

function destroyUploadedFile(file) {
  return destroyCloudinaryAsset(file?.filename, file?.resourceType || "image", file?.deliveryType || "upload");
}

function destroyCloudinaryImage(publicId) {
  return destroyCloudinaryAsset(publicId, "image");
}

module.exports = { destroyCloudinaryAsset, destroyCloudinaryImage, destroyUploadedFile };
