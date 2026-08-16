const dotenv = require("dotenv");
const mongoose = require("mongoose");
dotenv.config();
require("../src/config/validateEnv")();

const models = [
  require("../src/models/club.model"),
  require("../src/models/event.model"),
  require("../src/models/session.model"),
  require("../src/models/registerationEvent.model"),
  require("../src/models/roundCandidate.model"),
  require("../src/models/roundSubmission.model"),
  require("../src/models/sessionRsvp.model"),
  require("../src/models/notification.model"),
  require("../src/models/auditLog.model"),
  require("../src/models/job.model"),
  require("../src/models/rateLimitBucket.model"),
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { maxPoolSize: 2 });
  for (const model of models) {
    await model.createIndexes();
    console.log(`Indexes ready: ${model.collection.collectionName}`);
  }
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Scale index migration failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
