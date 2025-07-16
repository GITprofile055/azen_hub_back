const cron = require('node-cron');
const { Op } = require('sequelize');
const Trade = require('../models/Trade');
const Income = require('../models/Income');
const User = require("../models/User");

          // Fetch up to 5 levels of users based on sponsor hierarchy
          const fetchFiveLevelUsers = async (userId, level = 1, maxLevel = 5) => {
            const user = await User.findOne({
                where: { id: userId },
            });
        
            if (!user || level > maxLevel || !user.sponsor) return [];
        
            const sponsorUser = await User.findOne({
                where: { id: user.sponsor },
            });
        
            if (!sponsorUser) return [];
        
            const sponsorData = {
                id: sponsorUser.id,
                name: sponsorUser.name,
                level,
            };
            const parentSponsors = await fetchFiveLevelUsers(sponsorUser.id, level + 1, maxLevel);
            
            return [sponsorData, ...parentSponsors];
        };
        

// Define commission percentages for each level
const COMMISSION_RATES = {
  1: 0.10,  // 10%
  2: 0.06,  // 6%
  3: 0.05,  // 5%
  4: 0.03,  // 3%
  5: 0.01,  // 1%
};

const processDailyProfits = async () => {
  console.log("🔁 Cron is running...");
  try {
    const now = new Date();

    const runningTrades = await Trade.findAll({
      where: {
        status: 'Running',
        endtime: { [Op.lte]: now },
      },
    });

    for (const trade of runningTrades) {
      const userId = trade.user_id;
      const tradeId = trade.id;
      const plan = parseFloat(trade.plan);
      const amount = parseFloat(trade.amount);
      const period = parseInt(trade.period, 10);
      const serverHash = trade.selectedServer;

      let minROI, maxROI;

      // Determine ROI based on plan, amount, and period
      if (plan === 0 && amount >= 10 && amount <= 30) {
        minROI = 0.5;
        maxROI = 1;
        if (period === 5) {
          maxROI = minROI;
        } else if (period === 10) {
          minROI = maxROI;
        }
      } else if (plan === 5 && amount >= 10 && amount <= 30) {
        minROI = 1;
        maxROI = 1.5;
        if (period === 10) {
          maxROI = minROI;
        } else if (period === 24) {
          minROI = maxROI;
        }
      } else if (plan === 10 && amount >= 100 && amount <= 500) {
        minROI = 1;
        maxROI = 1.5;
        if (period === 12) {
          maxROI = minROI;
        } else if (period === 24) {
          minROI = maxROI;
        }
      } else if (plan === 50 && amount >= 500 && amount <= 2500) {
        minROI = 1.5;
        maxROI = 2;
        if (period === 12) {
          maxROI = minROI;
        } else if (period === 48) {
          minROI = maxROI;
        }
      } else if (plan === 120 && amount >= 2500 && amount <= 10000) {
        minROI = 2;
        maxROI = 2.5;
        if (period === 12) {
          maxROI = minROI;
        } else if (period === 96) {
          minROI = maxROI;
        }
      } else if (plan === 340 && amount >= 10000) {
        minROI = 2;
        maxROI = 2.5;
        if (period === 12) {
          maxROI = minROI;
        } else if (period === 120) {
          minROI = maxROI;
        }
      } else {
        continue; // Skip invalid trade ranges
      }

      const roiPercent = (Math.random() * (maxROI - minROI) + minROI) / 100;
      const roiAmount = parseFloat((amount * roiPercent).toFixed(2));

      // ✅ Insert income entry
      const income = await Income.create({
        user_id: userId,
        user_id_fk: tradeId,
        amt: amount,
        comm: roiAmount,
        ttime: new Date(),
        credit_type: 0,
        level: 0,
        remarks: `Trade Income`,
      });


       // ✅ Distribute commission to 5 levels
       const levels = await fetchFiveLevelUsers(userId);
       for (const levelUser of levels) {
           const commissionRate = COMMISSION_RATES[levelUser.level] || 0;
           const commissionAmount = parseFloat((roiAmount * commissionRate).toFixed(2));
           if (commissionAmount > 0) {
               try {
                   await Income.create({
                       user_id: levelUser.id,
                       user_id_fk: tradeId,
                       amt: amount,
                       comm: commissionAmount,
                       ttime: new Date(),
                       credit_type: 1,  // Commission
                       level: levelUser.level,
                       remarks: `ROI Income`,
                   });
                   console.log(`💰 Level ${levelUser.level} commission sent to user ${levelUser.id}: $${commissionAmount}`);
               } catch (error) {
                   console.error(`❌ Failed to add level ${levelUser.level} commission for user ${levelUser.id}:`, error);
               }
           }
       }

      // ✅ Update trade status after income created
      if (income) {
        await Trade.update(
          { status: "Complete" },
          { where: { id: tradeId } }
        );

        console.log(`✅ Income sent to user ${userId} from server ${serverHash}: $${roiAmount} (${(roiPercent * 100).toFixed(2)}%)`);
      }
    }

  } catch (error) {
    console.error('❌ Error processing daily profits:', error);
  }
};

// 🕛 Schedule daily at 12:00 PM
cron.schedule('0 12 * * *', async () => {
  console.log("⏳ Running scheduled daily profit cron...");
  await processDailyProfits();
});

// 🧪 Optional: Run immediately for testing
processDailyProfits();
