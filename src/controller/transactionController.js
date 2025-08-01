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
      return res.status(200).json({ success: false, message: "User not authenticated!" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(200).json({ success: false, message: "User not found!" });
    }

    // Fetch all histories
    const [investments, incomes, buyfunds, withdrawals] = await Promise.all([
      Investment.findAll({ where: { user_id: userId }, order: [['created_at', 'DESC']] }),
      Income.findAll({ where: { user_id: userId }, order: [['created_at', 'DESC']] }),
      BuyFund.findAll({ where: { user_id: userId }, order: [['created_at', 'DESC']] }),
      Withdraw.findAll({ where: { user_id: userId }, order: [['created_at', 'DESC']] })
    ]);

    // Combine all data with a "type"
    const combinedRecords = [
      ...investments.map(item => ({
        amount: item.amount,
        date: item.created_at,
        type: 'subscription'
      })),
      ...incomes.map(item => ({
        amount: item.comm || 0,
        date: item.created_at,
        type: item.remarks || 'Income'
      })),
      ...buyfunds.map(item => ({
        amount: item.amount,
        date: item.created_at,
        type: 'Deposit'
      })),
      ...withdrawals.map(item => ({
        amount: item.amount,
        date: item.created_at,
        type: 'Withdrawal'
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)); // sort by latest

    res.json({
      success: true,
      records: combinedRecords
    });

  } catch (error) {
    console.error("Error fetching histories:", error.message);
    res.status(500).json({ error: error.message });
  }
};
  

module.exports = {getUserHistory};