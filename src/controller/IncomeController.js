const User = require('../models/User');
const Income = require('../models/Income');
const Withdraw = require('../models/Withdraw');
const BuyFund = require('../models/BuyFunds');
const Server = require('../models/Servers');
const Trade = require('../models/Trade');
const { calculateAvailableBalance } = require("../helper/helper");
const axios = require('axios');
const sequelize = require('../config/connectDB');
const Investment = require('../models/Investment');
const crypto = require('crypto');
const bcrypt = require("bcryptjs");

const BindMail = async (req, res) => {
  try {
    const {verification_code } = req.body;
    if (!verification_code) {
      return res.status(400).json({ message: "All fields are required!" });
    }
    // Step 1: Get OTP record from password_resets table
    const [otpRecord] = await sequelize.query(
      'SELECT * FROM password_resets WHERE token = ? ORDER BY created_at DESC LIMIT 1',
      {
        replacements: [verification_code],
        type: sequelize.QueryTypes.SELECT
      }
    );
    if (!otpRecord) {
      return res.status(404).json({ message: "Invalid or expired verification code!" });
    }
    // Step 2: Get user using email from OTP record
    const user = await User.findOne({ where: { email: otpRecord.email } });

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }
    if (user.bind_device === 1) {
      return res.status(200).json({ success: true, message: "This account is already connected." });
    }
    const ud = await user.update({ bind_device: '1' });
    await sequelize.query(
      'DELETE FROM password_resets WHERE token = ?',
      {
        replacements: [verification_code],
        type: sequelize.QueryTypes.DELETE
      }
    );

    return res.status(200).json({
      success: true,
      message: "Email Bind successfully!"
    });

  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


const roincome = async (req, res) => {
  try {
    const userId = req.user?.id;
    if(!userId){
      return res.status(200).json({success: false, message:"Unauthorised User!"});
    }
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }
    const incomes = await Income.findAll({
      where: {
        user_id: userId,
        remarks: "Roi Income"
      }
    });
    res.status(200).json({ success: true, incomes });
  } catch (error) {
    console.error("Error fetching trade incomes:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
module.exports = {BindMail,roincome};