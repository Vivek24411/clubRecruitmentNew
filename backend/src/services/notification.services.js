const { enqueueNotification, enqueueNotifications } = require('./jobQueue.services');

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

module.exports = { notifyStudent, notifyTeam, notifyRegistrations, notifyStudents: enqueueNotifications };
