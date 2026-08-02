require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/utils/dbConnection");
const eventModel = require("../src/models/event.model");
const registrationModel = require("../src/models/registerationEvent.model");
const eventMembershipModel = require("../src/models/eventMembership.model");
const sessionModel = require("../src/models/session.model");
const sessionRsvpModel = require("../src/models/sessionRsvp.model");
const rateLimitBucketModel = require("../src/models/rateLimitBucket.model");
const applicationHistoryModel = require("../src/models/applicationHistory.model");

async function ensureMembership({ eventId, registrationId, studentId, role, joinedAt }) {
  try {
    await eventMembershipModel.updateOne(
      { eventId, studentId },
      { $setOnInsert: { registrationId, role, joinedAt } },
      { upsert: true }
    );
  } catch (error) {
    if (error?.code !== 11000) throw error;
    console.warn(`Skipped conflicting ${role} membership for student ${studentId} in event ${eventId}`);
  }
}

async function migrate() {
  await connectDB();

  const events = await eventModel.find({ registrationDeadlineAt: { $exists: false }, registerationDeadline: { $exists: true, $ne: "" } });
  for (const event of events) {
    await eventModel.updateOne(
      { _id: event._id },
      { $set: { registrationDeadlineAt: new Date(`${event.registerationDeadline}T23:59:59.999+05:30`) } }
    );
  }

  const registrations = await registrationModel.find().sort({ registeredAt: 1, _id: 1 });
  for (const registration of registrations) {
    if (registration.overallStatus === "withdrawn") {
      await eventMembershipModel.deleteMany({ registrationId: registration._id });
      await applicationHistoryModel.updateOne(
        { studentId: registration.studentId, registrationId: registration._id, reason: "withdrawn" },
        { $setOnInsert: {
          eventId: registration.eventId,
          captainId: registration.studentId,
          role: "captain",
          teamName: registration.teamName,
          roundDetails: registration.roundDetails || [],
          currentRound: registration.currentRound || 0,
          numberOfRounds: registration.numberOfRounds || 0,
          registeredAt: registration.registeredAt,
          createdAt: registration.updatedAt || registration.registeredAt || new Date(),
        } },
        { upsert: true }
      );
      continue;
    }
    await ensureMembership({
      eventId: registration.eventId,
      registrationId: registration._id,
      studentId: registration.studentId,
      role: "captain",
      joinedAt: registration.registeredAt || new Date(),
    });
    for (const studentId of registration.membersAccepted || []) {
      await ensureMembership({
        eventId: registration.eventId,
        registrationId: registration._id,
        studentId,
        role: "member",
        joinedAt: registration.registeredAt || new Date(),
      });
    }
  }

  const sessions = await sessionModel.find();
  for (const session of sessions) {
    const confirmedRsvpCount = await sessionRsvpModel.countDocuments({ sessionId: session._id, status: { $in: ["confirmed", "attended"] } });
    await sessionModel.updateOne({ _id: session._id }, { $set: { confirmedRsvpCount }, $unset: { expiresAt: "" } });
  }

  try {
    const indexes = await sessionModel.collection.indexes();
    const oldTtlIndex = indexes.find((index) => index.key?.expiresAt === 1);
    if (oldTtlIndex) await sessionModel.collection.dropIndex(oldTtlIndex.name);
  } catch (error) {
    if (error?.code !== 26 && error?.codeName !== "NamespaceNotFound") throw error;
  }
  await rateLimitBucketModel.createIndexes();
  await applicationHistoryModel.createIndexes();

  await mongoose.disconnect();
  console.log(`Migration complete: ${events.length} deadlines, ${registrations.length} registrations, ${sessions.length} sessions checked.`);
}

migrate().catch(async (error) => {
  console.error("Migration failed:", error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
