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

async function sendEmail({ to, subject, text }) {
    const { error } = await getResendClient().emails.send({
        from: process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL,
        to,
        subject,
        text,
    });
    if (error) throw new Error(`Resend email failed: ${error.message || error.name || 'unknown error'}`);
}

module.exports.sendOtp = async (email, otp) => {
    await sendEmail({
        to: email,
        subject: 'OTP Verification',
        text: `Your OTP is ${otp}`,
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
    if (!/^[^\s@]+@[^\s@]+$/.test(normalizedEmail)) return false;
    const domain = normalizedEmail.slice(normalizedEmail.lastIndexOf('@') + 1);
    return domain === 'iitr.ac.in' || domain.endsWith('.iitr.ac.in');
}
