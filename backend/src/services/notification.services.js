const notificationModel = require('../models/notification.model');
const studentModel = require('../models/student.model');
const { sendNotificationEmail } = require('./student.services');

async function notifyStudent(studentId, notification) {
  if (!studentId) return null;
  const student = await studentModel.findById(studentId).select('email notificationPreferences');
  if (!student) return null;

  const tasks = [];
  if (student.notificationPreferences?.inApp !== false) {
    tasks.push(notificationModel.create({ studentId, ...notification }));
  }
  if (student.notificationPreferences?.email !== false) {
    tasks.push(sendNotificationEmail(student.email, notification));
  }
  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === 'rejected') console.error('Notification delivery failed:', result.reason?.message || 'unknown error');
  }
  return results.find((result) => result.status === 'fulfilled' && result.value?._id)?.value || null;
}

async function notifyTeam(registration, notification) {
  const recipients = [registration.studentId, ...(registration.membersAccepted || [])];
  return Promise.all(recipients.map((studentId) => notifyStudent(studentId, notification)));
}

module.exports = { notifyStudent, notifyTeam };
