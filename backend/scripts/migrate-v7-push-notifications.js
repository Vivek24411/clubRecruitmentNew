const dotenv = require("dotenv");
dotenv.config();
const connectDB = require("../src/utils/dbConnection");
const pushRegistrationModel = require("../src/models/pushRegistration.model");

async function main() {
  await connectDB();
  await pushRegistrationModel.createIndexes();
  console.log("Push-notification indexes created");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Push-notification migration failed:", error);
    process.exit(1);
  });
