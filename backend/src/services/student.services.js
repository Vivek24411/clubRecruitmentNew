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
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>Discovr verification code</title>
</head>
<body style="margin:0;padding:0;background:#f2f0e9;color:#111612;font-family:Arial,'Helvetica Neue',sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        Use ${otp} to verify your Discovr account. This code expires in 5 minutes.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f2f0e9;">
        <tr>
            <td align="center" style="padding:40px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;background:#fbfaf6;border:1px solid #dcd8cd;border-radius:20px;box-shadow:0 18px 50px -28px rgba(17,22,18,0.45);overflow:hidden;">
                    <tr>
                        <td style="height:5px;background:#d55432;font-size:0;line-height:0;">&nbsp;</td>
                    </tr>
                    <tr>
                        <td style="padding:32px 36px 0;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td width="48" valign="middle">
                                        <div style="width:42px;height:42px;line-height:42px;text-align:center;background:#111612;color:#fbfaf6;border-radius:12px;font-size:18px;font-weight:700;">D</div>
                                    </td>
                                    <td valign="middle" style="padding-left:12px;">
                                        <div style="font-size:16px;line-height:22px;font-weight:700;color:#111612;">Discovr</div>
                                        <div style="font-size:11px;line-height:16px;letter-spacing:1.4px;text-transform:uppercase;color:#697169;">Campus opportunities</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:34px 36px 12px;">
                            <div style="font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#d55432;">Email verification</div>
                            <h1 style="margin:8px 0 12px;font-size:30px;line-height:38px;letter-spacing:-0.6px;color:#111612;">Your one-time code</h1>
                            <p style="margin:0;font-size:15px;line-height:24px;color:#697169;">Enter this code in Discovr to continue. It is valid for the next 5 minutes.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:16px 36px 20px;">
                            <div style="padding:22px 16px;background:#f7e2da;border:1px solid #edc8ba;border-radius:12px;text-align:center;">
                                <div style="font-family:'Courier New',Courier,monospace;font-size:34px;line-height:42px;font-weight:700;letter-spacing:9px;color:#a9361b;white-space:nowrap;">${otp}</div>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 36px 36px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#e6f0e9;border-radius:10px;">
                                <tr>
                                    <td width="28" valign="top" style="padding:16px 0 16px 16px;color:#2f6b4f;font-size:18px;line-height:22px;">&#10003;</td>
                                    <td style="padding:16px 16px 16px 8px;font-size:13px;line-height:20px;color:#384039;">
                                        <strong style="color:#2f6b4f;">Keep this code private.</strong><br>
                                        Discovr will never ask you to share it over a call or message.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:22px 36px;background:#111612;color:#969c96;font-size:12px;line-height:19px;">
                            If you did not request this code, you can safely ignore this email.<br>
                            <span style="color:#fbfaf6;">Discovr</span> &middot; Indian Institute of Technology Roorkee
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
    };
    const actionLabel = escapeHtml(actionLabels[type] || "View details");
    const detailRows = [
        emailDetails?.startsAt ? ["Date and time", formatNotificationDateTime(emailDetails.startsAt)] : null,
        emailDetails?.venue ? ["Venue", emailDetails.venue] : null,
    ].filter(Boolean);
    const detailCard = detailRows.length || emailDetails?.meetingUrl
        ? `<tr><td style="padding:8px 34px 8px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2f0e9;border-radius:10px;">${detailRows.map(([label, value]) => `<tr><td style="padding:12px 16px;border-bottom:1px solid #dcd8cd;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#697169;">${escapeHtml(label)}</td><td style="padding:12px 16px;border-bottom:1px solid #dcd8cd;font-size:14px;font-weight:700;color:#111612;text-align:right;">${escapeHtml(value)}</td></tr>`).join("")}${emailDetails?.meetingUrl ? `<tr><td colspan="2" style="padding:14px 16px;"><a href="${escapeHtml(emailDetails.meetingUrl)}" style="color:#d55432;font-size:14px;font-weight:700;text-decoration:none;">Open meeting link &rarr;</a></td></tr>` : ""}</table></td></tr>`
        : "";
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f2f0e9;color:#111612;font-family:Arial,'Helvetica Neue',sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safeMessage}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f2f0e9;">
        <tr><td align="center" style="padding:40px 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:580px;background:#fbfaf6;border:1px solid #dcd8cd;border-radius:16px;overflow:hidden;">
                <tr><td style="height:5px;background:#d55432;font-size:0;line-height:0;">&nbsp;</td></tr>
                <tr><td style="padding:30px 34px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
                        <td style="width:42px;height:42px;text-align:center;background:#111612;color:#fbfaf6;border-radius:10px;font-size:18px;font-weight:700;">D</td>
                        <td style="padding-left:12px;"><div style="font-size:16px;font-weight:700;">Discovr</div><div style="padding-top:3px;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#697169;">${type === "session_reminder" ? "Session reminder" : "Application update"}</div></td>
                    </tr></table>
                </td></tr>
                <tr><td style="padding:32px 34px 12px;">
                    <h1 style="margin:0 0 12px;font-size:28px;line-height:36px;color:#111612;">${safeTitle}</h1>
                    <p style="margin:0;font-size:15px;line-height:24px;color:#535b54;">${safeMessage}</p>
                </td></tr>
                ${detailCard}
                ${detailsUrl ? `<tr><td style="padding:16px 34px 34px;"><a href="${escapeHtml(detailsUrl)}" style="display:inline-block;padding:13px 20px;background:#111612;color:#ffffff;text-decoration:none;border-radius:7px;font-size:14px;font-weight:700;">${actionLabel}</a><p style="margin:14px 0 0;font-size:12px;line-height:18px;color:#858b85;">If the button does not open, copy this URL into your browser:<br><span style="word-break:break-all;color:#535b54;">${escapeHtml(detailsUrl)}</span></p></td></tr>` : ""}
                <tr><td style="padding:20px 34px;background:#111612;color:#969c96;font-size:12px;line-height:19px;">This message was sent because your Discovr email notifications are enabled.<br><span style="color:#fbfaf6;">Discovr</span> &middot; Indian Institute of Technology Roorkee</td></tr>
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
        text: `${message || "You have a new application update."}${emailDetails?.startsAt ? `\nDate and time: ${formatNotificationDateTime(emailDetails.startsAt)}` : ""}${emailDetails?.venue ? `\nVenue: ${emailDetails.venue}` : ""}${emailDetails?.meetingUrl ? `\nMeeting link: ${emailDetails.meetingUrl}` : ""}${detailsUrl ? `\n\nView details: ${detailsUrl}` : ""}`,
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
module.exports.formatNotificationDateTime = formatNotificationDateTime;
