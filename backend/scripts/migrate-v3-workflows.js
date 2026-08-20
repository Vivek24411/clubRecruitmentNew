require("dotenv").config();
const mongoose = require("mongoose");
const eventModel = require("../src/models/event.model");
const clubModel = require("../src/models/club.model");
const studentModel = require("../src/models/student.model");
const platformSettingsModel = require("../src/models/platformSettings.model");
const registerationEventModel = require("../src/models/registerationEvent.model");
const { DEFAULT_BRANCHES, deriveAcademicState, parseAcademicYear } = require("../src/services/academic.services");
const { ensureEventVerticals, ensureRegistrationWorkflow } = require("../src/services/eventWorkflow.services");

async function migrate() {
  const uri = process.env.MONGODB_URI || process.env.DB_CONNECT;
  if (!uri) throw new Error("MONGODB_URI or DB_CONNECT is required");
  await mongoose.connect(uri);

  const settings = await platformSettingsModel.findOneAndUpdate(
    { key: "global" },
    {
      $setOnInsert: { key: "global" },
      $set: {
        "academicConfiguration.rolloverMonth": 6,
        "academicConfiguration.rolloverDay": 1,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  if (!settings.academicConfiguration?.branches?.length) {
    settings.academicConfiguration.branches = DEFAULT_BRANCHES;
    await settings.save();
  }

  const clubs = await clubModel.find({ $or: [{ accountEmail: { $exists: false } }, { accountEmail: "" }] });
  let clubEmailsMigrated = 0;
  let clubEmailsMissing = 0;
  for (const club of clubs) {
    if (club.contactEmail) {
      club.accountEmail = String(club.contactEmail).trim().toLowerCase();
      try {
        await club.save();
        clubEmailsMigrated += 1;
      } catch (error) {
        console.warn(`Club ${club.name} needs a unique account email: ${error.message}`);
        clubEmailsMissing += 1;
      }
    } else {
      console.warn(`Club ${club.name} needs an account email before OTP recovery can be used`);
      clubEmailsMissing += 1;
    }
  }

  const students = await studentModel.find();
  let studentsMigrated = 0;
  for (const student of students) {
    const configuredBranch = settings.academicConfiguration.branches.find((branch) => branch.name === student.branch);
    if (configuredBranch) student.courseDurationYears = configuredBranch.durationYears;
    student.academicYear = student.academicYear || parseAcademicYear(student.year) || 1;
    Object.assign(student, deriveAcademicState(student, settings));
    await student.save();
    studentsMigrated += 1;
  }

  const events = await eventModel.find();
  let eventsMigrated = 0;
  let registrationsMigrated = 0;
  for (const event of events) {
    await ensureEventVerticals(event);
    if (event.rounds?.length) eventsMigrated += 1;
    const registrations = await registerationEventModel.find({ eventId: event._id });
    for (const registration of registrations) {
      await ensureRegistrationWorkflow(event, registration);
      registrationsMigrated += 1;
    }
  }

  console.log(JSON.stringify({
    clubEmailsMigrated,
    clubEmailsMissing,
    studentsMigrated,
    eventsMigrated,
    registrationsMigrated,
  }, null, 2));
  await mongoose.disconnect();
}

migrate().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
