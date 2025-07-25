const { User, Investment,Income,Withdraw,Machine} = require("../models"); // Adjust path as needed
const { Op } = require("sequelize"); // ✅ Import Sequelize Operators
const nodemailer = require("nodemailer");
const BuyFund = require("../models/BuyFunds");
const {sendotp} = require("../controller/userController");

async function sendEmail(email, subject, data) {
    try {
        // ✅ Create a transporter using cPanel SMTP
        const transporter = nodemailer.createTransport({
            host: "mail.finomax.xyz", // Replace with your cPanel SMTP host
            port: 465, // Use 465 for SSL, 587 for TLS
            secure: true, // true for 465, false for 587
            auth: {
                user: "info@finomax.xyz", // Your email
                pass: "finomax@7$", // Your email password
            },
        });
        const mailOptions = {
            from: '"Finomax" <info@finomax.xyz>', // Replace with your email
            to: email,
            subject: subject,
            html: `<p>Hi ${data.name},</p>
                   <p>We’re inform you that a One-Time Password (OTP) has been generated for your account authentication. Please use the OTP below to continue with your verification process.</p>
                   <p>OTP: ${data.code}</p>`,
        };
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.response);
    } catch (error) {
        console.error("Error sending email:", error);
    }
}


module.exports = {sendEmail};