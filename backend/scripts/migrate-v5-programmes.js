require("dotenv").config();

const mongoose = require("mongoose");
const clubModel = require("../src/models/club.model");
const eventModel = require("../src/models/event.model");
const platformSettingsModel = require("../src/models/platformSettings.model");
const studentModel = require("../src/models/student.model");
const {
  DEFAULT_BRANCHES,
  deriveAcademicState,
  normalizeProgrammeEligibility,
} = require("../src/services/academic.services");
const { normalizedClubTypes } = require("../src/services/platformConfiguration.services");

async function migrate() {
  const uri = process.env.MONGODB_URI || process.env.DB_CONNECT;
  if (!uri) throw new Error("MONGODB_URI or DB_CONNECT is required");
  await mongoose.connect(uri);

  const settings = await platformSettingsModel.findOneAndUpdate(
    { key: "global" },
    { $setOnInsert: { key: "global" } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const existingBranches = settings.academicConfiguration?.branches || [];
  const branches = new Map(DEFAULT_BRANCHES.map((branch) => [branch.name, branch]));
  existingBranches.forEach((branch) => branches.set(branch.name, {
    name: branch.name,
    durationYears: branch.durationYears,
  }));
  const assignedClubTypes = await clubModel.distinct("category");
  settings.academicConfiguration.branches = [...branches.values()];
  settings.academicConfiguration.rolloverMonth = 6;
  settings.clubTypes = normalizedClubTypes({ clubTypes: [...(settings.clubTypes || []), ...assignedClubTypes.filter(Boolean)] });
  await settings.save();

  let studentsMigrated = 0;
  for (const student of await studentModel.find()) {
    if (!student.programme) student.programme = "undergraduate";
    Object.assign(student, deriveAcademicState(student, settings));
    await student.save();
    studentsMigrated += 1;
  }

  let eventsMigrated = 0;
  for (const event of await eventModel.find()) {
    if (!event.eligibilityMode) event.eligibilityMode = "undergraduate";
    event.programmeEligibility = normalizeProgrammeEligibility(
      event.programmeEligibility,
      event.eligibilityMode,
      event.eligibilityYears,
    );
    event.eligibilityBranches = [];
    event.allowPassedOut = false;
    await event.save();
    eventsMigrated += 1;
  }

  console.log(JSON.stringify({
    studentsMigrated,
    eventsMigrated,
    undergraduateBranches: settings.academicConfiguration.branches.length,
    clubTypes: settings.clubTypes,
  }, null, 2));
  await mongoose.disconnect();
}

migrate().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
