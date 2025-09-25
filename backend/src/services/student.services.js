const nodemailer = require('nodemailer');





module.exports.sendOtp = async (email, otp) => {

    const transporter = nodemailer.createTransport({
        host: "smtp-relay.brevo.com",
        port: 587,
        secure: false,
        auth: {
            user: process.env.BREVO_USER,
            pass: process.env.BREVO_API_KEY
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


module.exports.checkEmailDomain = (email) => {
    const regex = /@.*iitr\.ac\.in$/i;
    return regex.test(email);
}
