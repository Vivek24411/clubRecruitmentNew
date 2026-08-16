const dotenv = require("dotenv");
dotenv.config();
require("./src/config/validateEnv")();
const connectDB = require("./src/utils/dbConnection");
const { startJobWorker } = require("./src/services/jobQueue.services");

async function main() {
  await connectDB();
  startJobWorker();
  console.log("Discovr job worker started");
}

main().catch((error) => {
  console.error("Job worker failed to start:", error);
  process.exitCode = 1;
});
