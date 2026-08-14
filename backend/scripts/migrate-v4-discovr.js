require("dotenv").config();
const mongoose = require("mongoose");
const eventModel = require("../src/models/event.model");
const eventMembershipModel = require("../src/models/eventMembership.model");
const roundCandidateModel = require("../src/models/roundCandidate.model");
const registerationEventModel = require("../src/models/registerationEvent.model");
const sessionModel = require("../src/models/session.model");
const studentModel = require("../src/models/student.model");

async function migrate() {
  const uri = process.env.MONGODB_URI || process.env.DB_CONNECT;
  if (!uri) throw new Error("MONGODB_URI or DB_CONNECT is required");

  await mongoose.connect(uri);

  const candidateLineage = await roundCandidateModel.updateMany(
    {
      sourceCandidateId: { $type: "objectId" },
      $or: [
        { sourceCandidateIds: { $exists: false } },
        { sourceCandidateIds: { $size: 0 } },
      ],
    },
    [{ $set: { sourceCandidateIds: ["$sourceCandidateId"] } }],
  );

  const studentMediaDefaults = await studentModel.updateMany(
    { profilePicture: { $exists: false } },
    { $set: { profilePicture: "", profilePicturePublicId: "" } },
  );
  const sessionMediaDefaults = await sessionModel.updateMany(
    { sessionThumbnail: { $exists: false } },
    { $set: { sessionThumbnail: "", sessionThumbnailPublicId: "" } },
  );
  const sessionCreatedDates = await sessionModel.updateMany(
    { createdAt: { $exists: false } },
    [{ $set: { createdAt: { $toDate: "$_id" } } }],
  );
  const withdrawnRegistrationIds = await registerationEventModel
    .find({ overallStatus: "withdrawn" })
    .distinct("_id");
  const staleMemberships = withdrawnRegistrationIds.length
    ? await eventMembershipModel.deleteMany({ registrationId: { $in: withdrawnRegistrationIds } })
    : { deletedCount: 0 };

  let participantRoundsCorrected = 0;
  let participantCandidatesConverted = 0;
  const eventsWithTests = await eventModel.find({
    $or: [
      { "rounds.type": "test" },
      { registrationType: "individual" },
    ],
  });
  for (const event of eventsWithTests) {
    let eventChanged = false;
    for (const round of event.rounds.filter((item) =>
      item.type === "test" || event.registrationType === "individual")) {
      if (round.evaluationScope !== "participant") {
        round.evaluationScope = "participant";
        eventChanged = true;
        participantRoundsCorrected += 1;
      }

      const legacyCandidates = await roundCandidateModel.find({
        eventId: event._id,
        roundId: round._id,
        scope: "application",
        status: { $ne: "revoked" },
      });
      for (const legacy of legacyCandidates) {
        let participantIds = legacy.participantIds || [];
        if (!participantIds.length) {
          const registration = await registerationEventModel.findById(legacy.registrationId)
            .select("studentId membersAccepted");
          participantIds = registration
            ? [registration.studentId, ...(registration.membersAccepted || [])].filter(Boolean)
            : [];
        }

        if (participantIds.length === 1) {
          const [studentId] = participantIds;
          const existingParticipant = await roundCandidateModel.findOne({
            eventId: legacy.eventId,
            roundId: legacy.roundId,
            registrationId: legacy.registrationId,
            studentId,
            _id: { $ne: legacy._id },
          });
          if (!existingParticipant) {
            legacy.scope = "participant";
            legacy.studentId = studentId;
            legacy.participantIds = [studentId];
            await legacy.save();
            participantCandidatesConverted += 1;
            continue;
          }
        }

        for (const studentId of participantIds) {
          const participantCandidate = await roundCandidateModel.findOneAndUpdate(
            {
              eventId: legacy.eventId,
              roundId: legacy.roundId,
              registrationId: legacy.registrationId,
              studentId,
            },
            {
              $setOnInsert: {
                eventId: legacy.eventId,
                roundId: legacy.roundId,
                registrationId: legacy.registrationId,
                studentId,
                participantIds: [studentId],
                scope: "participant",
                status: legacy.status,
                score: legacy.score,
                notes: legacy.notes,
                decisionPublishedAt: legacy.decisionPublishedAt,
                sourceCandidateId: legacy.sourceCandidateId,
                sourceCandidateIds: legacy.sourceCandidateIds || [],
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          );
          await roundCandidateModel.updateMany(
            {
              eventId: event._id,
              participantIds: studentId,
              $or: [
                { sourceCandidateId: legacy._id },
                { sourceCandidateIds: legacy._id },
              ],
            },
            { $addToSet: { sourceCandidateIds: participantCandidate._id } },
          );
          participantCandidatesConverted += 1;
        }
        if (participantIds.length) {
          legacy.status = "revoked";
          await legacy.save();
        }
      }
    }
    if (eventChanged) await event.save();
  }

  const registrationCollection = registerationEventModel.collection;
  let registrationIndexes = [];
  try {
    registrationIndexes = await registrationCollection.indexes();
  } catch (error) {
    // A fresh database may not have this collection yet. createIndexes below
    // will create it with the current, non-unique historical-attempt index.
    if (error?.codeName !== "NamespaceNotFound" && error?.code !== 26) throw error;
  }
  const legacyRegistrationIndex = registrationIndexes.find((index) =>
    index.unique
    && JSON.stringify(index.key) === JSON.stringify({ eventId: 1, studentId: 1 }));
  if (legacyRegistrationIndex) {
    await registrationCollection.dropIndex(legacyRegistrationIndex.name);
  }

  await Promise.all([
    roundCandidateModel.createIndexes(),
    eventModel.createIndexes(),
    registerationEventModel.createIndexes(),
    eventMembershipModel.createIndexes(),
    studentModel.createIndexes(),
    sessionModel.createIndexes(),
  ]);

  console.log(JSON.stringify({
    candidateLineageMigrated: candidateLineage.modifiedCount,
    studentMediaDefaultsAdded: studentMediaDefaults.modifiedCount,
    sessionMediaDefaultsAdded: sessionMediaDefaults.modifiedCount,
    sessionCreatedDatesAdded: sessionCreatedDates.modifiedCount,
    staleWithdrawnMembershipsRemoved: staleMemberships.deletedCount,
    legacyRegistrationIndexRemoved: Boolean(legacyRegistrationIndex),
    participantRoundsCorrected,
    participantCandidatesConverted,
  }, null, 2));

  await mongoose.disconnect();
}

migrate().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
