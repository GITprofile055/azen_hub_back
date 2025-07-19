const cron = require('node-cron');
const generateRoiIncome = require('../cron/cronController');

cron.schedule('1 0 * * *', () => {
  console.log(" Running ROI income cron job...");
  generateRoiIncome();
});
