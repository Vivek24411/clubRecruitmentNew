const nodemailer = require('nodemailer');



module.exports.sendOtp = async (email, otp) => {

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: 'vive44814@gmail.com',
            pass: "yduv xiui vxek zvmc"
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
