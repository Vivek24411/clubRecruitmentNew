const cloudinary = require("../config/cloudinary");

function plainSubmission(submission) {
  if (!submission) return submission;
  return submission.toObject ? submission.toObject() : { ...submission };
}

/** Remove provider URLs from API payloads and replace them with an authenticated API path. */
function secureSubmission(submission, role) {
  const value = plainSubmission(submission);
  if (!value) return value;
  value.files = (value.files || []).map((file, index) => {
    const safe = file?.toObject ? file.toObject() : { ...file };
    delete safe.url;
    safe.downloadPath = `/${role}/submissions/${value._id}/files/${index}`;
    return safe;
  });
  return value;
}

function secureSubmissions(submissions, role) {
  return (submissions || []).map((submission) => secureSubmission(submission, role));
}

function signedDownloadUrl(file) {
  const expiresAt = Math.floor(Date.now() / 1000) + 5 * 60;
  return {
    url: cloudinary.utils.private_download_url(file.publicId, file.format || "", {
      resource_type: file.resourceType || "image",
      type: file.deliveryType || "upload",
      attachment: true,
      expires_at: expiresAt,
    }),
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}

module.exports = { secureSubmission, secureSubmissions, signedDownloadUrl };
