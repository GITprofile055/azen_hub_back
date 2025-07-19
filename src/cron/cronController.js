
const Investment = require('../models/Investment');
const Income = require('../models/Income');
const User = require('../models/User');

const addLevelIncome = require('../helper/helper');

const moment = require('moment');

const generateRoiIncome = async () => {
  try {
    console.log("ROI income");

    const plans = [
      { amount: 2, days: 2, perDay: 1.5, totalProfit: 3 },
      { amount: 30, days: 25, perDay: 2.4, totalProfit: 60 },
      { amount: 299, days: 45, perDay: 13.2888889, totalProfit: 598 },
      { amount: 600, days: 60, perDay: 20, totalProfit: 1200 },
      { amount: 1200, days: 75, perDay: 32, totalProfit: 2400 }
    ];

    const activeInvestments = await Investment.findAll({
      where: { status: "Active" }
    });

    if (!activeInvestments.length) {
      console.log("No active investments found.");
      return;
    }

    for (const investment of activeInvestments) {
      const userId = investment.user_id;
      const investId = investment.id;
      const investedAmount = parseFloat(investment.amount);

      const plan = plans.find(p => p.amount === investedAmount);
      if (!plan) {
        console.log(` No matching plan for user ${userId} with amount ₹${investedAmount}`);
        continue;
      }

      const totalIncome = await Income.sum('comm', {
        where: {
          user_id: userId,
          remarks: 'Roi Income'
        }
      }) || 0;

      if (totalIncome >= plan.totalProfit) {
        console.log(` User ${userId} already received full ROI: ₹${totalIncome}`);
        continue;
      }

      const today = moment().format('YYYY-MM-DD');
      const existing = await Income.findOne({
        where: {
          user_id: userId,
          remarks: 'Roi Income',
          ttime: today
        }
      });

      if (existing) {
        console.log(`ℹ️ ROI already generated for user ${userId} on ${today}`);
        continue;
      }

      const user = await User.findOne({ where: { id: userId } });

      if (!user) {
        console.log(` User not found with ID ${userId}`);
        continue;
      }

      await Income.create({
        user_id: userId,
        user_id_fk: user.username, 
        amt: investedAmount,
        comm: plan.perDay,
        remarks: "Roi Income",
        ttime: today,
        invest_id: investId
      });

      await addLevelIncome(userId, plan.perDay, investId);

      console.log(`ROI given to user ${userId} (${user.username}): ₹${plan.perDay.toFixed(2)} on ${today}`);
    }

    console.log(" ROI income generation completed.");
  } catch (error) {
    console.error(" Error while generating ROI income:", error.message);
  }
};


module.exports = {generateRoiIncome};
