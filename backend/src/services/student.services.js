const { Resend } = require('resend');
const { buildPublicAppUrl } = require('../utils/appOrigin');

const DEFAULT_FROM_EMAIL = 'Discovr <noreply@expediva.in>';
let resendClient;

function brandedFromEmail(configuredValue) {
    const configured = String(configuredValue || DEFAULT_FROM_EMAIL).trim();
    const addressMatch = configured.match(/<\s*([^<>]+)\s*>\s*$/);
    const address = (addressMatch?.[1] || configured).trim();
    return `Discovr <${address}>`;
}

function emailLogoUrl() {
    const configured = String(process.env.EMAIL_LOGO_URL || '').trim();
    if (/^https:\/\//i.test(configured)) return configured;
    return buildPublicAppUrl('/discovrlogo.png', process.env.STUDENT_APP_ORIGIN)
        || 'https://discovr.iitr.ac.in/discovrlogo.png';
}

function buildEmailBrandHeader(label) {
    return `<tr>
        <td style="padding:24px 32px;background:#075d94;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <td valign="middle">
                        <img src="${escapeHtml(emailLogoUrl())}" width="148" alt="Discovr" style="display:block;width:148px;max-width:100%;height:auto;border:0;">
                    </td>
                    <td valign="middle" align="right" style="padding-left:16px;color:#d9effb;font-size:10px;line-height:15px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;">
                        ${escapeHtml(label)}
                    </td>
                </tr>
            </table>
        </td>
    </tr>`;
}

function getResendClient() {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is not configured');
    }
    if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
    return resendClient;
}

async function sendEmail({ to, subject, text, html, idempotencyKey }) {
    const { data, error } = await getResendClient().emails.send({
        from: brandedFromEmail(process.env.RESEND_FROM_EMAIL),
        to,
        subject,
        text,
        html,
    }, idempotencyKey ? { idempotencyKey } : undefined);
    if (error) throw new Error(`Resend email failed: ${error.message || error.name || 'unknown error'}`);
    return data;
}

function buildOtpEmailHtml(otp) {
    const safeOtp = escapeHtml(otp);
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>Discovr verification code</title>
</head>
<body style="margin:0;padding:0;background:#eef7fc;color:#10212d;font-family:Arial,'Helvetica Neue',sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        Use ${safeOtp} to verify your Discovr account. This code expires in 5 minutes.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#eef7fc;">
        <tr>
            <td align="center" style="padding:40px 14px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #c8dfec;border-radius:18px;box-shadow:0 18px 50px -30px rgba(7,93,148,0.45);overflow:hidden;">
                    ${buildEmailBrandHeader('Secure account access')}
                    <tr>
                        <td style="padding:34px 34px 12px;">
                            <div style="font-size:11px;line-height:17px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#0878be;">Email verification</div>
                            <h1 style="margin:8px 0 12px;font-size:30px;line-height:38px;letter-spacing:-0.5px;color:#10212d;">Your one-time code</h1>
                            <p style="margin:0;font-size:15px;line-height:24px;color:#52636e;">Enter this code in Discovr to continue. It is valid for the next 5 minutes.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:16px 34px 20px;">
                            <div style="padding:22px 12px;background:#e5f3fb;border:1px solid #b9dcef;border-radius:12px;text-align:center;">
                                <div style="font-family:'Courier New',Courier,monospace;font-size:34px;line-height:42px;font-weight:700;letter-spacing:9px;color:#075d94;white-space:nowrap;">${safeOtp}</div>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 34px 34px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f9fc;border:1px solid #d8e9f2;border-radius:10px;">
                                <tr>
                                    <td width="28" valign="top" style="padding:16px 0 16px 16px;color:#0878be;font-size:18px;line-height:22px;">&#128274;</td>
                                    <td style="padding:16px 16px 16px 8px;font-size:13px;line-height:20px;color:#52636e;">
                                        <strong style="color:#075d94;">Keep this code private.</strong><br>
                                        Discovr will never ask you to share it over a call or message.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:22px 34px;background:#062f4b;color:#a9cadc;font-size:12px;line-height:19px;">
                            If you did not request this code, you can safely ignore this email.<br>
                            <span style="color:#ffffff;">Discovr</span> &middot; Indian Institute of Technology Roorkee
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatNotificationDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-IN", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
    });
}

function buildNotificationEmailHtml({ title, message, detailsUrl, type, emailDetails }) {
    const safeTitle = escapeHtml(title || "Discovr update");
    const safeMessage = escapeHtml(message || "You have a new application update.");
    const actionLabels = {
        team_invitation: "Review invitation",
        round_scheduled: "View schedule",
        round_advanced: "Open next round",
        round_waitlisted: "View application",
        event_deadline_changed: "View updated event",
        event_extracted: "Open event",
        session_reminder: "View session",
        round_deadline_reminder: "Open round",
        round_interview_reminder: "View interview",
    };
    const actionLabel = escapeHtml(actionLabels[type] || "View details");
    const detailRows = [
        emailDetails?.clubName ? ["Club", emailDetails.clubName] : null,
        emailDetails?.eventName ? ["Event", emailDetails.eventName] : null,
        emailDetails?.roundName ? ["Round", emailDetails.roundName] : null,
        emailDetails?.startsAt ? [emailDetails?.dateLabel || "Date and time", formatNotificationDateTime(emailDetails.startsAt)] : null,
        emailDetails?.venue ? ["Venue", emailDetails.venue] : null,
    ].filter(Boolean);
    const detailCard = detailRows.length || emailDetails?.meetingUrl
        ? `<tr><td style="padding:8px 34px 8px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f9fc;border:1px solid #d8e9f2;border-radius:10px;">${detailRows.map(([label, value]) => `<tr><td style="padding:12px 16px;border-bottom:1px solid #d8e9f2;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#69808d;">${escapeHtml(label)}</td><td style="padding:12px 16px;border-bottom:1px solid #d8e9f2;font-size:14px;font-weight:700;color:#10212d;text-align:right;">${escapeHtml(value)}</td></tr>`).join("")}${emailDetails?.meetingUrl ? `<tr><td colspan="2" style="padding:14px 16px;"><a href="${escapeHtml(emailDetails.meetingUrl)}" style="color:#0878be;font-size:14px;font-weight:700;text-decoration:none;">Open meeting link &rarr;</a></td></tr>` : ""}</table></td></tr>`
        : "";
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#eef7fc;color:#10212d;font-family:Arial,'Helvetica Neue',sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safeMessage}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#eef7fc;">
        <tr><td align="center" style="padding:40px 14px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:580px;background:#ffffff;border:1px solid #c8dfec;border-radius:18px;box-shadow:0 18px 50px -30px rgba(7,93,148,0.4);overflow:hidden;">
                ${buildEmailBrandHeader(type === "session_reminder" ? "Session reminder" : type === "round_deadline_reminder" || type === "round_interview_reminder" ? "Round reminder" : "Application update")}
                <tr><td style="padding:32px 34px 12px;">
                    <div style="margin-bottom:8px;font-size:11px;line-height:17px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;color:#0878be;">New Discovr update</div>
                    <h1 style="margin:0 0 12px;font-size:28px;line-height:36px;color:#10212d;">${safeTitle}</h1>
                    <p style="margin:0;font-size:15px;line-height:24px;color:#52636e;">${safeMessage}</p>
                </td></tr>
                ${detailCard}
                ${detailsUrl ? `<tr><td style="padding:16px 34px 34px;"><a href="${escapeHtml(detailsUrl)}" style="display:inline-block;padding:13px 20px;background:#0878be;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;box-shadow:0 7px 18px -10px rgba(7,93,148,0.8);">${actionLabel}</a><p style="margin:14px 0 0;font-size:12px;line-height:18px;color:#7a8c96;">If the button does not open, copy this URL into your browser:<br><span style="word-break:break-all;color:#466273;">${escapeHtml(detailsUrl)}</span></p></td></tr>` : ""}
                <tr><td style="padding:20px 34px;background:#062f4b;color:#a9cadc;font-size:12px;line-height:19px;">This message was sent because your Discovr email notifications are enabled.<br><span style="color:#ffffff;">Discovr</span> &middot; Indian Institute of Technology Roorkee</td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>`;
}

module.exports.sendOtp = async (email, otp) => {
    return sendEmail({
        to: email,
        subject: `${otp} is your Discovr verification code`,
        text: `Your Discovr verification code is ${otp}. It expires in 5 minutes. If you did not request this code, you can ignore this email.`,
        html: buildOtpEmailHtml(otp),
    });
};

module.exports.sendNotificationEmail = async (email, { title, message, link, type, emailDetails }, { idempotencyKey } = {}) => {
    if (!process.env.RESEND_API_KEY) return;
    const hasInternalLink = link?.startsWith('/') && !link.startsWith('//');
    const detailsUrl = buildPublicAppUrl(link, process.env.STUDENT_APP_ORIGIN);
    if (hasInternalLink && !detailsUrl) {
        throw new Error('STUDENT_APP_ORIGIN must be a public HTTPS origin before notification emails can be sent');
    }
    await sendEmail({
        to: email,
        subject: String(title || "Discovr update").replace(/[\r\n]/g, " "),
        text: `${message || "You have a new application update."}${emailDetails?.clubName ? `\nClub: ${emailDetails.clubName}` : ""}${emailDetails?.eventName ? `\nEvent: ${emailDetails.eventName}` : ""}${emailDetails?.roundName ? `\nRound: ${emailDetails.roundName}` : ""}${emailDetails?.startsAt ? `\n${emailDetails?.dateLabel || "Date and time"}: ${formatNotificationDateTime(emailDetails.startsAt)}` : ""}${emailDetails?.venue ? `\nVenue: ${emailDetails.venue}` : ""}${emailDetails?.meetingUrl ? `\nMeeting link: ${emailDetails.meetingUrl}` : ""}${detailsUrl ? `\n\nView details: ${detailsUrl}` : ""}`,
        html: buildNotificationEmailHtml({ title, message, detailsUrl, type, emailDetails }),
        idempotencyKey,
    });
};


module.exports.checkEmailDomain = (email) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const atIndex = normalizedEmail.lastIndexOf('@');
    if (atIndex <= 0) return false;
    const domain = normalizedEmail.slice(atIndex + 1);
    return domain === 'iitr.ac.in' || domain.endsWith('.iitr.ac.in');
}

module.exports.brandedFromEmail = brandedFromEmail;
module.exports.emailLogoUrl = emailLogoUrl;
module.exports.buildOtpEmailHtml = buildOtpEmailHtml;
module.exports.buildNotificationEmailHtml = buildNotificationEmailHtml;
module.exports.formatNotificationDateTime = formatNotificationDateTime;
