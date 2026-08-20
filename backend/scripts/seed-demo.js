require("dotenv").config();

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const connectDB = require("../src/utils/dbConnection");
const studentModel = require("../src/models/student.model");
const clubModel = require("../src/models/club.model");
const eventModel = require("../src/models/event.model");
const sessionModel = require("../src/models/session.model");
const registrationModel = require("../src/models/registerationEvent.model");
const eventMembershipModel = require("../src/models/eventMembership.model");
const sessionRsvpModel = require("../src/models/sessionRsvp.model");
const notificationModel = require("../src/models/notification.model");

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "DemoStudent123!";
const DEMO_CLUB_PASSWORD = process.env.DEMO_CLUB_PASSWORD || "DemoClub123!";

function addDays(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

async function upsert(Model, filter, values) {
  return Model.findOneAndUpdate(
    filter,
    { $set: values },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );
}

function applicationRounds(event, statuses = []) {
  return (event.roundDetails || []).map((round, index) => ({
    ...round,
    selected: statuses[index] === "cleared",
    status: statuses[index] || "not_scheduled",
    roundDate: statuses[index] === "scheduled" ? addDays(3 + index) : null,
    remarks: "",
  }));
}

async function seed() {
  if (process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Demo seeding is disabled. Set ALLOW_DEMO_SEED=true to confirm the target database.");
  }
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");

  await connectDB();

  const [studentPassword, clubPassword] = await Promise.all([
    bcrypt.hash(DEMO_PASSWORD, 12),
    bcrypt.hash(DEMO_CLUB_PASSWORD, 12),
  ]);

  const studentDefinitions = [
    {
      name: "Demo Alice Sharma",
      email: "demo.alice@example.test",
      branch: "Computer Science",
      year: "Third",
      phoneNumber: "+910000000001",
      enrollmentNumber: "DEMO0001",
    },
    {
      name: "Demo Bob Verma",
      email: "demo.bob@example.test",
      branch: "Electrical Engineering",
      year: "Second",
      phoneNumber: "+910000000002",
      enrollmentNumber: "DEMO0002",
    },
    {
      name: "Demo Cara Singh",
      email: "demo.cara@example.test",
      branch: "Electronics and Communication",
      year: "Fourth",
      phoneNumber: "+910000000003",
      enrollmentNumber: "DEMO0003",
    },
    {
      name: "Demo Dev Mehta",
      email: "demo.dev@example.test",
      branch: "Engineering Physics",
      year: "First",
      phoneNumber: "+910000000004",
      enrollmentNumber: "DEMO0004",
    },
  ];

  const students = {};
  for (const definition of studentDefinitions) {
    students[definition.email] = await upsert(studentModel, { email: definition.email }, {
      ...definition,
      password: studentPassword,
      tokenVersion: 0,
      status: "active",
      notificationPreferences: { email: false, inApp: true },
    });
  }

  const roboticsClub = await upsert(clubModel, { userName: "demo-robotics" }, {
    name: "[Demo] Robotics Club",
    userName: "demo-robotics",
    password: clubPassword,
    shortDescription: "Build autonomous machines and learn practical robotics.",
    longDescription: "A demo club record for testing discovery, events, sessions, applications, and moderation.",
    recruitmentMethods: "Aptitude round, practical task, and interview.",
    achivements: "Demo winner of the campus autonomous navigation challenge.",
    contactEmail: "robotics@example.test",
    contactPhone: "+910000001001",
    status: "active",
    tokenVersion: 0,
  });

  const designClub = await upsert(clubModel, { userName: "demo-design" }, {
    name: "[Demo] Design Club",
    userName: "demo-design",
    password: clubPassword,
    shortDescription: "Explore visual design, product thinking, and creative collaboration.",
    longDescription: "A second demo club used to test lists, filters, individual recruitment, and session capacity.",
    recruitmentMethods: "Portfolio exercise followed by a conversation.",
    contactEmail: "design@example.test",
    contactPhone: "+910000001002",
    status: "active",
    tokenVersion: 0,
  });

  const roboticsDeadline = addDays(30);
  const designDeadline = addDays(21);
  const closedDeadline = addDays(-5);

  const roboticsEvent = await upsert(eventModel, {
    clubId: roboticsClub._id,
    title: "[Demo] Autonomous Rover Challenge",
  }, {
    clubId: roboticsClub._id,
    title: "[Demo] Autonomous Rover Challenge",
    shortDescription: "Form a small team and prototype an autonomous rover.",
    longDescription: "Applicants work through an aptitude round, a guided build task, and a final interview. This event exercises the complete team recruitment workflow.",
    registerationDeadline: dateOnly(roboticsDeadline),
    registrationDeadlineAt: roboticsDeadline,
    registrationType: "team",
    minTeamSize: 2,
    maxTeamSize: 4,
    maxParticipants: 4,
    ContactInfo: ["robotics@example.test", "+91 00000 01001"],
    roundDetails: [
      { Type: "Test", Description: "A short robotics and reasoning quiz." },
      { Type: "Submission", Description: "Submit a simple rover design." },
      { Type: "Interview", Description: "Discuss your design and interests." },
    ],
    eligibility: "Open to all years and branches.",
    numberOfRounds: 3,
    status: "published",
    publishedAt: new Date(),
  });

  const designEvent = await upsert(eventModel, {
    clubId: designClub._id,
    title: "[Demo] Poster Design Sprint",
  }, {
    clubId: designClub._id,
    title: "[Demo] Poster Design Sprint",
    shortDescription: "Create a poster from a compact design brief.",
    longDescription: "An individual demo event for testing application submission and selection statuses.",
    registerationDeadline: dateOnly(designDeadline),
    registrationDeadlineAt: designDeadline,
    registrationType: "individual",
    minTeamSize: 1,
    maxTeamSize: 1,
    maxParticipants: 1,
    ContactInfo: ["design@example.test"],
    roundDetails: [
      { Type: "Submission", Description: "Submit one poster and a short rationale." },
    ],
    eligibility: "No prior design experience required.",
    numberOfRounds: 1,
    status: "published",
    publishedAt: new Date(),
  });

  await upsert(eventModel, {
    clubId: roboticsClub._id,
    title: "[Demo] Archived Hardware Quiz",
  }, {
    clubId: roboticsClub._id,
    title: "[Demo] Archived Hardware Quiz",
    shortDescription: "A closed event for testing status filters.",
    longDescription: "This demo event has already closed and should not accept new applications.",
    registerationDeadline: dateOnly(closedDeadline),
    registrationDeadlineAt: closedDeadline,
    registrationType: "individual",
    minTeamSize: 1,
    maxTeamSize: 1,
    maxParticipants: 1,
    ContactInfo: ["robotics@example.test"],
    roundDetails: [],
    eligibility: "Open to all students.",
    numberOfRounds: 0,
    status: "closed",
    publishedAt: addDays(-20),
  });

  const roboticsSession = await upsert(sessionModel, {
    clubId: roboticsClub._id,
    title: "[Demo] Robotics Orientation",
  }, {
    clubId: roboticsClub._id,
    title: "[Demo] Robotics Orientation",
    shortDescription: "Meet the team and see current projects.",
    longDescription: "A capacity-limited demo session with confirmed and waitlisted RSVPs.",
    date: dateOnly(addDays(7)),
    time: "18:00",
    venue: "Demo Innovation Lab",
    duration: "90",
    status: "published",
    capacity: 2,
    confirmedRsvpCount: 2,
  });

  await upsert(sessionModel, {
    clubId: designClub._id,
    title: "[Demo] Portfolio Workshop",
  }, {
    clubId: designClub._id,
    title: "[Demo] Portfolio Workshop",
    shortDescription: "Learn how to present projects clearly.",
    longDescription: "An open-capacity demo session for testing session discovery.",
    date: dateOnly(addDays(12)),
    time: "17:30",
    venue: "Demo Lecture Hall",
    duration: "60",
    status: "published",
    capacity: 50,
    confirmedRsvpCount: 0,
  });

  // Events created above get their hidden default vertical from the model
  // hook; every registration and membership has to name it.
  const roboticsVerticalId = roboticsEvent.verticals[0]._id;
  const designVerticalId = designEvent.verticals[0]._id;

  const alice = students["demo.alice@example.test"];
  const bob = students["demo.bob@example.test"];
  const cara = students["demo.cara@example.test"];
  const dev = students["demo.dev@example.test"];

  const teamRegistration = await upsert(registrationModel, {
    eventId: roboticsEvent._id,
    verticalId: roboticsVerticalId,
    studentId: alice._id,
  }, {
    eventId: roboticsEvent._id,
    verticalId: roboticsVerticalId,
    studentId: alice._id,
    roundDetails: applicationRounds(roboticsEvent, ["cleared", "scheduled"]),
    membersAccepted: [bob._id],
    membersOffered: [dev._id],
    numberOfRounds: roboticsEvent.numberOfRounds,
    teamName: "Demo Circuit Breakers",
    overallStatus: "in_progress",
    currentRound: 2,
    reviewerNotes: "Strong first round; awaiting the prototype submission.",
    score: 82,
    registeredAt: addDays(-3),
    updatedAt: new Date(),
  });

  const selectedRegistration = await upsert(registrationModel, {
    eventId: designEvent._id,
    verticalId: designVerticalId,
    studentId: cara._id,
  }, {
    eventId: designEvent._id,
    verticalId: designVerticalId,
    studentId: cara._id,
    roundDetails: applicationRounds(designEvent, ["cleared"]),
    membersAccepted: [],
    membersOffered: [],
    numberOfRounds: designEvent.numberOfRounds,
    teamName: null,
    overallStatus: "selected",
    currentRound: 1,
    reviewerNotes: "Clear hierarchy and thoughtful typography.",
    score: 94,
    registeredAt: addDays(-4),
    updatedAt: new Date(),
  });

  await Promise.all([
    upsert(eventMembershipModel, { eventId: roboticsEvent._id, verticalId: roboticsVerticalId, studentId: alice._id }, {
      eventId: roboticsEvent._id,
      verticalId: roboticsVerticalId,
      registrationId: teamRegistration._id,
      studentId: alice._id,
      role: "captain",
      joinedAt: teamRegistration.registeredAt,
    }),
    upsert(eventMembershipModel, { eventId: roboticsEvent._id, verticalId: roboticsVerticalId, studentId: bob._id }, {
      eventId: roboticsEvent._id,
      verticalId: roboticsVerticalId,
      registrationId: teamRegistration._id,
      studentId: bob._id,
      role: "member",
      joinedAt: teamRegistration.registeredAt,
    }),
    upsert(eventMembershipModel, { eventId: designEvent._id, verticalId: designVerticalId, studentId: cara._id }, {
      eventId: designEvent._id,
      verticalId: designVerticalId,
      registrationId: selectedRegistration._id,
      studentId: cara._id,
      role: "captain",
      joinedAt: selectedRegistration.registeredAt,
    }),
  ]);

  await Promise.all([
    upsert(sessionRsvpModel, { sessionId: roboticsSession._id, studentId: alice._id }, {
      sessionId: roboticsSession._id,
      studentId: alice._id,
      status: "confirmed",
      updatedAt: new Date(),
    }),
    upsert(sessionRsvpModel, { sessionId: roboticsSession._id, studentId: bob._id }, {
      sessionId: roboticsSession._id,
      studentId: bob._id,
      status: "confirmed",
      updatedAt: new Date(),
    }),
    upsert(sessionRsvpModel, { sessionId: roboticsSession._id, studentId: dev._id }, {
      sessionId: roboticsSession._id,
      studentId: dev._id,
      status: "waitlisted",
      updatedAt: new Date(),
    }),
  ]);

  await Promise.all([
    upsert(notificationModel, {
      studentId: alice._id,
      type: "demo.application",
      title: "[Demo] Round scheduled",
    }, {
      studentId: alice._id,
      type: "demo.application",
      title: "[Demo] Round scheduled",
      message: "Your prototype submission round has been scheduled.",
      link: `/event/${roboticsEvent._id}`,
      readAt: null,
      createdAt: new Date(),
    }),
    upsert(notificationModel, {
      studentId: cara._id,
      type: "demo.application",
      title: "[Demo] Application selected",
    }, {
      studentId: cara._id,
      type: "demo.application",
      title: "[Demo] Application selected",
      message: "Congratulations! Your demo design application was selected.",
      link: `/event/${designEvent._id}`,
      readAt: null,
      createdAt: new Date(),
    }),
  ]);

  console.log("Demo data is ready.");
  console.log(`Students: ${studentDefinitions.map((student) => student.email).join(", ")}`);
  console.log(`Student password: ${DEMO_PASSWORD}`);
  console.log("Clubs: demo-robotics, demo-design");
  console.log(`Club password: ${DEMO_CLUB_PASSWORD}`);
}

seed()
  .catch((error) => {
    console.error("Demo seed failed:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
