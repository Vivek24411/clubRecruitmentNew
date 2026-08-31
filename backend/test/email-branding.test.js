const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildNotificationEmailHtml,
  buildOtpEmailHtml,
  emailAppOrigin,
  emailLogoUrl,
} = require("../src/services/student.services");

test("Discovr emails use the live logo and blue app branding", () => {
  const previousOrigin = process.env.STUDENT_APP_ORIGIN;
  const previousLogo = process.env.EMAIL_LOGO_URL;
  process.env.STUDENT_APP_ORIGIN = "https://discovr.iitr.ac.in";
  delete process.env.EMAIL_LOGO_URL;

  try {
    const otpHtml = buildOtpEmailHtml("123456");
    const notificationHtml = buildNotificationEmailHtml({
      title: "Round deadline is today",
      message: "Submit your response before the deadline.",
      detailsUrl: "https://discovr.iitr.ac.in/applications",
      type: "round_deadline_reminder",
      emailDetails: { clubName: "Example Club", eventName: "Example Event" },
    });

    assert.equal(emailLogoUrl(), "https://discovr.iitr.ac.in/discovrlogo.png");
    for (const html of [otpHtml, notificationHtml]) {
      assert.match(html, /src="https:\/\/discovr\.iitr\.ac\.in\/discovrlogo\.png"/);
      assert.match(html, /#0878be/i);
      assert.doesNotMatch(html, /#d55432/i);
      assert.doesNotMatch(html, />D<\/td>/i);
    }
  } finally {
    if (previousOrigin === undefined) delete process.env.STUDENT_APP_ORIGIN;
    else process.env.STUDENT_APP_ORIGIN = previousOrigin;
    if (previousLogo === undefined) delete process.env.EMAIL_LOGO_URL;
    else process.env.EMAIL_LOGO_URL = previousLogo;
  }
});

test("email links use the canonical IITR app even while a legacy push origin remains configured", () => {
  const previousStudentOrigin = process.env.STUDENT_APP_ORIGIN;
  const previousEmailOrigin = process.env.EMAIL_APP_ORIGIN;
  process.env.STUDENT_APP_ORIGIN = "https://discovr.devx6.live";
  delete process.env.EMAIL_APP_ORIGIN;
  try {
    assert.equal(emailAppOrigin(), "https://discovr.iitr.ac.in");
    assert.equal(emailLogoUrl(), "https://discovr.iitr.ac.in/discovrlogo.png");
  } finally {
    if (previousStudentOrigin === undefined) delete process.env.STUDENT_APP_ORIGIN;
    else process.env.STUDENT_APP_ORIGIN = previousStudentOrigin;
    if (previousEmailOrigin === undefined) delete process.env.EMAIL_APP_ORIGIN;
    else process.env.EMAIL_APP_ORIGIN = previousEmailOrigin;
  }
});

test("email logo can be overridden with a secure hosted asset", () => {
  const previousLogo = process.env.EMAIL_LOGO_URL;
  process.env.EMAIL_LOGO_URL = "https://cdn.example.com/discovr-email.png";
  try {
    assert.equal(emailLogoUrl(), "https://cdn.example.com/discovr-email.png");
  } finally {
    if (previousLogo === undefined) delete process.env.EMAIL_LOGO_URL;
    else process.env.EMAIL_LOGO_URL = previousLogo;
  }
});

test("incomplete submission emails use an application reminder label and action", () => {
  const html = buildNotificationEmailHtml({
    title: "Complete your application",
    message: "Your response has not been submitted yet.",
    detailsUrl: "https://discovr.iitr.ac.in/event/507f1f77bcf86cd799439011",
    type: "submission_due_reminder",
    emailDetails: {
      clubName: "Kshitij",
      eventName: "Kshitij Recruitment",
      roundName: "Application round",
      startsAt: "2026-09-02T18:29:59.000Z",
      dateLabel: "Submission deadline",
    },
  });
  assert.match(html, /Application reminder/);
  assert.match(html, /Complete application/);
  assert.match(html, /Submission deadline/);
  assert.match(html, /Kshitij Recruitment/);
});
