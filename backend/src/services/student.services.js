const nodemailer = require('nodemailer');
const { Resend } = require('resend');




module.exports.sendOtp = async (email, otp) => {

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

//   try{
//     console.log('Sending email to:', email);
    
//       const {data, error} = await resend.emails.send({
//         from: 'noreply.0to1@gmail.com',
//         to: 'noreply.0to1@gmail.com',
//         subject: 'OTP Verification',
//         text: `Your OTP is ${otp}`,
//     });

//     console.log(error);
    

//     if (error) {
//         throw new Error('Error sending email');
//     }

//     console.log('Email sent:', data);
//   }catch(err){
//     console.error('Error sending email:', err);
//     throw err;
//   }

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
