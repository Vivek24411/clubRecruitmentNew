const nodemailer = require('nodemailer');



module.exports.sendOtp = async (email, otp) => {

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: 'vive44814@gmail.com',
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: 'vive44814@gmail.com',
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
