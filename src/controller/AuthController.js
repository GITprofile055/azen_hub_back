const sequelize = require('../config/connectDB');
const bcrypt = require("bcryptjs");
require('dotenv').config();
const User = require("../models/User");
const jwt = require("jsonwebtoken");




const register = async (req, res) => {
  console.log(req.body);
    try {
        const { name, phone, email, password, sponsor, countryCode } = req.body;
        
        if ( !name || !phone || !email || !password || !sponsor) {
            return res.status(400).json({ error: "All fields are required!" });
        }
  
        const existingUser = await User.findOne({where: { email: email ,  phone: phone } });
        
        
        if (existingUser) {
            return res.status(400).json({ error: "Email or Phone already exists!" });
        }
  
        // Check if sponsor exists
        const sponsorUser = await User.findOne({
            where: {
                username: sponsor  // Match the sponsor's username
            }
        });
        if (!sponsorUser) {
            return res.status(400).json({ error: "Sponsor does not exist!" });
        }
  
        // Generate username & transaction password
        const username = Math.random().toString(36).substring(2, 10);
        const tpassword = Math.random().toString(36).substring(2, 8);
  
        // Hash passwords
        const hashedPassword = await bcrypt.hash(password, 10);
        const hashedTPassword = await bcrypt.hash(tpassword, 10);
  
        // Get parent ID
        const lastUser = await User.findOne({
            order: [['id', 'DESC']]
        });
        const parentId = lastUser ? lastUser.id : null;
        // Provide a default for sponsor level if it's undefined or null
        const sponsorLevel = (sponsorUser.level !== undefined && sponsorUser.level !== null)
            ? sponsorUser.level
            : 0;
  
        // Construct new user object
        const newUser = {
            name,
            phone,
            email,
            username,
            password: hashedPassword,
            tpassword: hashedTPassword,
            PSR: password,
            TPSR: tpassword,
            sponsor: sponsorUser.id,
            level: sponsorLevel + 1,  // Default to 0 if sponsor level is not defined, then add 1
            ParentId: parentId,
            dialCode: countryCode,
        };
  
        // Insert new user into the database
        await User.create(newUser);
        return res.status(201).json({ message: "User registered successfully!", username });
  
    } catch (error) {
        console.error("Error:", error.message);
        return res.status(500).json({ error: "Server error", details: error.message });
    }
};



const login = async (req, res) => {

    try {
      // Destructure username and password from the request body.
      const { email, password } = req.body;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
          return res.status(400).json({ error: "Invalid email address" });
      }
      if (!email || !password) {
        return res.status(400).json({ error: "Username and Password are required!" });
      }
         
      // Find the user using Sequelize
      const user = await User.findOne({ where: { email } });
       
      if (!user) {
        return res.status(400).json({ error: "User not found!" });

      }
      // Compare the provided password with the stored hashed password.
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid credentials!" });
      }
  
      // Generate a JWT token.
      
      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,  
       
      );
  
      return res.status(200).json({
        status:true,
        message: "Login successful!",
        username: user.username,
        token,
      });
    } catch (error) {
      console.error("Error:", error.message);
      return res.status(500).json({ status:false , error: "Server error", details: error.message });
    }
  };




  const forgotPassword = async (req, res) => {
    try {
      const { email, password, password_confirmation, verification_code } = req.body;
  
      if (!email || !password || !password_confirmation || !verification_code) {
        return res.status(400).json({ message: "All fields are required!" });
      }
  
      if (password !== password_confirmation) {
        return res.status(400).json({ message: "Passwords do not match!" });
      }
  
      const [otpRecord] = await sequelize.query(
        'SELECT * FROM password_resets WHERE email = ? AND token = ? ORDER BY created_at DESC LIMIT 1',
        {
          replacements: [email, verification_code],
          type: sequelize.QueryTypes.SELECT
        }
      );
  
      if (!otpRecord) {
        return res.status(400).json({ message: "Invalid or expired verification code!" });
      }
  
      const user = await User.findOne({ where: { email } });
  
      if (!user) {
        return res.status(404).json({ message: "User not found!" });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
      user.PSR = password;
      await user.save();
  
     
      // await password_resets.destroy({ where: { email, token: verification_code } });
  
      return res.status(200).json({
        success: true,
        message: "Password reset successfully!"
      });
  
    } catch (error) {
      console.error("Forgot password error:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };
  


const sendForgotOtp = async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required!" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "Email not registered!" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const created_at = new Date();

    // Remove existing OTPs
    await sequelize.query(
      'DELETE FROM password_resets WHERE email = ?',
      {
        replacements: [email],
        type: sequelize.QueryTypes.DELETE,
      }
    );

    // Save new OTP
    await sequelize.query(
      'INSERT INTO password_resets (email, token, created_at) VALUES (?, ?, ?)',
      {
        replacements: [email, otp, created_at],
        type: sequelize.QueryTypes.INSERT,
      }
    );

    // Send OTP via email (configure in prod)
    // const transporter = nodemailer.createTransport({
    //   service: 'gmail',
    //   auth: {
    //     user: 'your@email.com',
    //     pass: 'your-app-password'
    //   }
    // });

    // await transporter.sendMail({
    //   from: '"Support" <your@email.com>',
    //   to: email,
    //   subject: 'Your OTP for Password Reset',
    //   text: `Your verification code is: ${otp}`
    // });

    return res.status(200).json({ success: true, message: "OTP sent to your email!" });

  } catch (error) {
    console.error("Forgot OTP send error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};












 
  
module.exports = { register ,login,forgotPassword,sendForgotOtp };
