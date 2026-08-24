const { enqueueNotification, enqueueNotifications } = require('./jobQueue.services');
const pushRegistrationModel = require('../models/pushRegistration.model');
const { exactHttpOrigin } = require('../utils/appOrigin');

async function notifyStudent(studentId, notification) {
  return studentId ? enqueueNotification(studentId, notification) : null;
}

async function notifyTeam(registration, notification) {
  const recipients = [registration.studentId, ...(registration.membersAccepted || [])];
  return enqueueNotifications(recipients, notification);
}

async function notifyRegistrations(registrations, notification) {
  const recipients = (registrations || []).flatMap((registration) => [
    registration.studentId,
    ...(registration.membersAccepted || []),
  ]);
  return enqueueNotifications(recipients, notification);
}

async function notifyPushRegisteredStudents(notification) {
  const appOrigin = exactHttpOrigin(process.env.STUDENT_APP_ORIGIN)?.origin;
  if (!appOrigin) return [];
  const recipients = await pushRegistrationModel.distinct("studentId", {
    appOrigin,
    expiresAt: { $gt: new Date() },
  });
  return enqueueNotifications(recipients, notification, { channels: ["push"] });
}

module.exports = { notifyStudent, notifyTeam, notifyRegistrations, notifyPushRegisteredStudents, notifyStudents: enqueueNotifications };
