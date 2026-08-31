require("dotenv").config();
const mongoose = require("mongoose");
const cloudinary = require("../src/config/cloudinary");

const DRY_RUN = process.argv.includes("--dry-run");

async function migrate() {
  const uri = process.env.MONGODB_URI || process.env.DB_CONNECT;
  if (!uri) throw new Error("MONGODB_URI or DB_CONNECT is required");
  for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) {
    if (!process.env[key]) throw new Error(`${key} is required`);
  }
  await mongoose.connect(uri, { maxPoolSize: 2 });
  const collection = mongoose.connection.db.collection("roundsubmissions");
  const cursor = collection.find({
    files: { $elemMatch: { deliveryType: { $ne: "authenticated" } } },
  });
  const summary = { submissions: 0, assets: 0, missing: 0, failed: 0 };

  for await (const submission of cursor) {
    const files = Array.isArray(submission.files) ? submission.files : [];
    let changed = false;
    for (const file of files) {
      if (!file.publicId || file.deliveryType === "authenticated") continue;
      summary.assets += 1;
      if (DRY_RUN) {
        console.log(`would protect ${file.resourceType || "image"}:${file.publicId}`);
        continue;
      }
      try {
        await cloudinary.uploader.rename(file.publicId, file.publicId, {
          resource_type: file.resourceType || "image",
          type: "upload",
          to_type: "authenticated",
          overwrite: false,
          invalidate: true,
        });
        file.deliveryType = "authenticated";
        file.url = "";
        changed = true;
      } catch (error) {
        const message = error?.message || String(error);
        // Some legacy rows point at assets that Cloudinary no longer has. The
        // API already strips stored provider URLs, but clear the stale URL and
        // retire the row from future migration attempts as well.
        if (/resource not found/i.test(message)) {
          file.deliveryType = "authenticated";
          file.url = "";
          changed = true;
          summary.missing += 1;
          console.warn(`missing asset; cleared stale delivery metadata for ${file.publicId}`);
          continue;
        }
        summary.failed += 1;
        console.error(`failed to protect ${file.publicId}:`, message);
      }
    }
    if (changed) {
      await collection.updateOne({ _id: submission._id }, { $set: { files } });
      summary.submissions += 1;
    }
  }

  console.log(`Private-submission migration${DRY_RUN ? " dry run" : ""}:`, summary);
  await mongoose.disconnect();
  if (summary.failed) process.exitCode = 1;
}

migrate().catch(async (error) => {
  console.error("Private-submission migration failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
