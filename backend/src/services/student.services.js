const nodemailer = require('nodemailer');





module.exports.sendOtp = async (email, otp) => {

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });


    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'OTP Verification',
        text: `Your OTP is ${otp}`
    };

    await transporter.sendMail(mailOptions);
};

module.exports.sendNotificationEmail = async (email, { title, message, link }) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    let detailsUrl = null;
    if (process.env.STUDENT_APP_ORIGIN && link?.startsWith('/') && !link.startsWith('//')) {
        try { detailsUrl = new URL(link, process.env.STUDENT_APP_ORIGIN).href; } catch { detailsUrl = null; }
    }
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: String(title || "Recruitment update").replace(/[\r\n]/g, " "),
        text: `${message || "You have a new recruitment update."}${detailsUrl ? `\n\nView details: ${detailsUrl}` : ""}`,
    });
};


module.exports.checkEmailDomain = (email) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    return /^[a-z]+_[a-z]{1,2}@[a-z]+\.iitr\.ac\.in$/.test(normalizedEmail);
}
