const express = require('express');
const router = express.Router();
const Income = require('../models/Income');
const Withdraw = require('../models/Withdraw');
const Investment = require('../models/Investment');
const BuyFund = require('../models/BuyFunds');
const User = require('../models/User');
const getUserHistory = async (req, res) => {
    try {
      const userId = req.user?.id;
  
      if (!userId) {
        return res.status(200).json({success: false, message: "User not authenticated!" });
      }
  
      const user = await User.findOne({ where: { id: userId } });
  
      if (!user) {
        return res.status(200).json({success: false, message: "User not found!" });
      }
  
      // Fetch from each model
      const [investmentHistory, incomeHistory, buyfunds,withdrawHistory] = await Promise.all([
        Investment.findAll({
          where: { user_id: userId },
          order: [['created_at', 'DESC']]
        }),
        Income.findAll({
          where: { user_id: userId },
          order: [['created_at', 'DESC']]
        }),
        BuyFund.findAll({
          where: { user_id: userId },
          order: [['created_at', 'DESC']]
        }),
        Withdraw.findAll({
          where: { user_id: userId },
          order: [['created_at', 'DESC']]
        })
      ]);
  
      res.json({
        success: true,
        buyfund: buyfunds,
        investment: investmentHistory,
        income: incomeHistory,
        withdraw: withdrawHistory
      });
  
    } catch (error) {
      console.error("Error fetching histories:", error.message);
      res.status(500).json({ error: error.message });
    }
  };
  

module.exports = {getUserHistory};