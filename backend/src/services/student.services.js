const { Resend } = require('resend');

const DEFAULT_FROM_EMAIL = 'Recruit IITR <noreply@devx6.live>';
let resendClient;

function getResendClient() {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is not configured');
    }
    if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
    return resendClient;
}

async function sendEmail({ to, subject, text, html }) {
    const { data, error } = await getResendClient().emails.send({
        from: process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL,
        to,
        subject,
        text,
        html,
    });
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
    <title>Recruit IITR verification code</title>
</head>
<body style="margin:0;padding:0;background:#f2f0e9;color:#111612;font-family:Arial,'Helvetica Neue',sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        Use ${otp} to verify your Recruit IITR account. This code expires in 5 minutes.
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
                                        <div style="width:42px;height:42px;line-height:42px;text-align:center;background:#111612;color:#fbfaf6;border-radius:12px;font-size:18px;font-weight:700;">R</div>
                                    </td>
                                    <td valign="middle" style="padding-left:12px;">
                                        <div style="font-size:16px;line-height:22px;font-weight:700;color:#111612;">Recruit IITR</div>
                                        <div style="font-size:11px;line-height:16px;letter-spacing:1.4px;text-transform:uppercase;color:#697169;">Student recruitment portal</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:34px 36px 12px;">
                            <div style="font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#d55432;">Email verification</div>
                            <h1 style="margin:8px 0 12px;font-size:30px;line-height:38px;letter-spacing:-0.6px;color:#111612;">Your one-time code</h1>
                            <p style="margin:0;font-size:15px;line-height:24px;color:#697169;">Enter this code in Recruit IITR to continue. It is valid for the next 5 minutes.</p>
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
                                        Recruit IITR will never ask you to share it over a call or message.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:22px 36px;background:#111612;color:#969c96;font-size:12px;line-height:19px;">
                            If you did not request this code, you can safely ignore this email.<br>
                            <span style="color:#fbfaf6;">Recruit IITR</span> &middot; Indian Institute of Technology Roorkee
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

module.exports.sendOtp = async (email, otp) => {
    return sendEmail({
        to: email,
        subject: `${otp} is your Recruit IITR verification code`,
        text: `Your Recruit IITR verification code is ${otp}. It expires in 5 minutes. If you did not request this code, you can ignore this email.`,
        html: buildOtpEmailHtml(otp),
    });
};

module.exports.sendNotificationEmail = async (email, { title, message, link }) => {
    if (!process.env.RESEND_API_KEY) return;
    let detailsUrl = null;
    if (process.env.STUDENT_APP_ORIGIN && link?.startsWith('/') && !link.startsWith('//')) {
        try { detailsUrl = new URL(link, process.env.STUDENT_APP_ORIGIN).href; } catch { detailsUrl = null; }
    }
    await sendEmail({
        to: email,
        subject: String(title || "Recruitment update").replace(/[\r\n]/g, " "),
        text: `${message || "You have a new recruitment update."}${detailsUrl ? `\n\nView details: ${detailsUrl}` : ""}`,
    });
};


module.exports.checkEmailDomain = (email) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const atIndex = normalizedEmail.lastIndexOf('@');
    if (atIndex <= 0) return false;
    const domain = normalizedEmail.slice(atIndex + 1);
    return domain === 'iitr.ac.in' || domain.endsWith('.iitr.ac.in');
}
