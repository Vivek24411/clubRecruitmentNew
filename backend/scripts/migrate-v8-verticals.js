require("dotenv").config();
const mongoose = require("mongoose");

// Moves every event onto the vertical model. Each existing event gains one
// hidden default vertical holding the rounds it already had, and every
// registration / membership / candidate / history row is stamped with that
// vertical's id.
//
// Round subdocuments are copied verbatim through the raw driver so their _ids
// survive: RoundCandidate.roundId, RoundSubmission.roundId and
// ScheduleSlot.roundId all point at them, and reminting those ids would orphan
// the entire workflow history.

const DRY_RUN = process.argv.includes("--dry-run");

// A collection that has never been written to does not exist yet, and listing
// its indexes throws NamespaceNotFound rather than returning nothing.
async function existingIndexes(collection) {
  try {
    return await collection.indexes();
  } catch (error) {
    if (error?.code === 26 || error?.codeName === "NamespaceNotFound") return [];
    throw error;
  }
}

async function migrate() {
  const uri = process.env.MONGODB_URI || process.env.DB_CONNECT;
  if (!uri) throw new Error("MONGODB_URI or DB_CONNECT is required");
  await mongoose.connect(uri, { maxPoolSize: 2 });
  const db = mongoose.connection.db;

  const events = db.collection("events");
  const registrations = db.collection("registerationevents");
  const memberships = db.collection("eventmemberships");
  const candidates = db.collection("roundcandidates");
  const histories = db.collection("applicationhistories");

  const pending = await events.find({
    $or: [{ verticals: { $exists: false } }, { verticals: { $size: 0 } }],
  }).toArray();

  console.log(`${pending.length} event(s) need a default vertical${DRY_RUN ? " (dry run)" : ""}`);

  const summary = {
    events: 0, registrations: 0, memberships: 0, candidates: 0, histories: 0, skipped: 0,
    retiredCandidates: 0, cancelledSlots: 0,
  };

  for (const event of pending) {
    const now = new Date();
    const verticalId = new mongoose.Types.ObjectId();
    const rounds = Array.isArray(event.rounds) ? event.rounds : [];
    const vertical = {
      _id: verticalId,
      title: event.title || "General",
      shortDescription: "",
      description: "",
      order: 1,
      isDefault: true,
      status: "open",
      registrationType: event.registrationType || "team",
      minTeamSize: event.minTeamSize || 1,
      maxTeamSize: event.maxTeamSize || 1,
      maxParticipants: event.maxParticipants ?? null,
      registrationDeadlineAt: null,
      eligibilityMode: null,
      programmeEligibility: [],
      rounds,
      numberOfRounds: rounds.length,
      createdAt: event.createdAt || now,
      updatedAt: now,
    };

    if (DRY_RUN) {
      console.log(`  would seed "${event.title}" with ${rounds.length} round(s)`);
      summary.events += 1;
      continue;
    }

    await events.updateOne(
      { _id: event._id },
      {
        $set: {
          verticals: [vertical],
          verticalsEnabled: false,
          maxVerticalApplications: 1,
        },
      }
    );
    summary.events += 1;

    const stamp = { $set: { verticalId } };
    const scope = { eventId: event._id, verticalId: { $exists: false } };
    summary.registrations += (await registrations.updateMany(scope, stamp)).modifiedCount;
    summary.memberships += (await memberships.updateMany(scope, stamp)).modifiedCount;
    summary.candidates += (await candidates.updateMany(scope, stamp)).modifiedCount;
    summary.histories += (await histories.updateMany(
      { eventId: event._id, verticalId: null },
      { $set: { verticalId, verticalTitle: vertical.title } }
    )).modifiedCount;
  }

  // Rows whose event was deleted out from under them can never resolve a
  // vertical. Report them rather than guessing.
  if (!DRY_RUN) {
    for (const [name, collection] of Object.entries({ registrations, memberships, candidates })) {
      const orphans = await collection.countDocuments({ verticalId: { $exists: false } });
      if (orphans) {
        summary.skipped += orphans;
        console.warn(`  ! ${orphans} ${name} row(s) have no resolvable event and were left unstamped`);
      }
    }
  }

  // Repair pass: withdrawing an application used to leave already-decided
  // candidates untouched, so a student who withdrew after being advanced stayed
  // visible in the club's round workspace. Retire those now.
  const withdrawnRegistrations = await registrations
    .find({ overallStatus: "withdrawn" }).project({ _id: 1 }).toArray();
  if (withdrawnRegistrations.length) {
    const stranded = {
      registrationId: { $in: withdrawnRegistrations.map((registration) => registration._id) },
      status: { $nin: ["withdrawn", "revoked"] },
    };
    const count = await candidates.countDocuments(stranded);
    if (DRY_RUN) {
      console.log(`  would retire ${count} candidate(s) left behind by withdrawn applications`);
    } else if (count) {
      const { modifiedCount } = await candidates.updateMany(stranded, { $set: { status: "withdrawn" } });
      summary.retiredCandidates = modifiedCount;
      // Their interview slots have to go with them.
      const slots = db.collection("scheduleslots");
      const strandedSlots = await slots.find({
        registrationId: stranded.registrationId, status: "scheduled",
      }).project({ _id: 1 }).toArray();
      if (strandedSlots.length) {
        const slotIds = strandedSlots.map((slot) => slot._id);
        await slots.updateMany({ _id: { $in: slotIds } }, { $set: { status: "cancelled" } });
        await db.collection("schedulereservations").deleteMany({ slotId: { $in: slotIds } });
        summary.cancelledSlots = slotIds.length;
      }
    }
  }

  if (!DRY_RUN) {
    // Uniqueness used to be "one per student per event" on both collections.
    // It is now per vertical, so any surviving (eventId, studentId) unique
    // index blocks a student's second vertical application. createIndexes()
    // only ever adds indexes, so these have to be dropped explicitly — they
    // outlive the schema that declared them.
    for (const [label, collection] of Object.entries({ eventmemberships: memberships, registerationevents: registrations })) {
      for (const index of await existingIndexes(collection)) {
        const staleUniqueness = index.unique
          && index.key.eventId === 1
          && index.key.studentId === 1
          && index.key.verticalId == null;
        if (!staleUniqueness) continue;
        await collection.dropIndex(index.name);
        console.log(`Dropped stale unique index ${label}.${index.name}`);
      }
    }

    for (const model of [
      require("../src/models/event.model"),
      require("../src/models/registerationEvent.model"),
      require("../src/models/eventMembership.model"),
      require("../src/models/roundCandidate.model"),
      require("../src/models/applicationHistory.model"),
    ]) {
      await model.createIndexes();
      console.log(`Indexes ready: ${model.collection.collectionName}`);
    }
  }

  console.log("Vertical migration complete:", summary);
  await mongoose.disconnect();
}

migrate().catch(async (error) => {
  console.error("Vertical migration failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
