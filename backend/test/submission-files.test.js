const assert = require("node:assert/strict");
const test = require("node:test");

process.env.CLOUDINARY_CLOUD_NAME ||= "test-cloud";
process.env.CLOUDINARY_API_KEY ||= "test-key";
process.env.CLOUDINARY_API_SECRET ||= "test-secret";

const { secureSubmission, signedDownloadUrl } = require("../src/services/submissionFiles.services");

test("submission serialization removes permanent provider URLs", () => {
  const result = secureSubmission({
    _id: "507f1f77bcf86cd799439011",
    files: [{
      fieldKey: "portfolio",
      url: "https://res.cloudinary.com/test-cloud/image/upload/public-file.pdf",
      publicId: "discovr/submissions/asset",
      resourceType: "raw",
      deliveryType: "authenticated",
    }],
  }, "student");
  assert.equal(result.files[0].url, undefined);
  assert.equal(result.files[0].downloadPath, "/student/submissions/507f1f77bcf86cd799439011/files/0");
});

test("authenticated assets receive an expiring signed download URL", () => {
  const before = Date.now();
  const result = signedDownloadUrl({
    publicId: "discovr/submissions/asset",
    resourceType: "raw",
    deliveryType: "authenticated",
    format: "pdf",
  });
  assert.match(result.url, /^https:\/\/api\.cloudinary\.com\/v1_1\/test-cloud\/raw\/download\?/);
  assert.match(result.url, /signature=/);
  assert.match(result.url, /type=authenticated/);
  assert.ok(new Date(result.expiresAt).getTime() > before);
  assert.ok(new Date(result.expiresAt).getTime() <= before + 6 * 60 * 1000);
});
