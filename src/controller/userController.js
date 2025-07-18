const User = require('../models/User');
const bcrypt = require('bcryptjs');
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


const available_balance = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(200).json({ success: false, message: "User not authenticated!" });
    }

    const user = await User.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(200).json({ success: false, message: "User not found!" });
    }

    const totalCommission = await Income.sum('comm', { where: { user_id: userId } }) || 0;
    const buyFunds = await BuyFund.sum('amount', { where: { user_id: userId } }) || 0;
    const investment = await Investment.sum('amount', { where: { user_id: userId } }) || 0;
    const totalWithdraw = await Withdraw.sum('amount', { where: { user_id: userId } }) || 0;
    const Rtrades = await Trade.sum('amount', { where: { user_id: userId, status: "Running" } }) || 0;
    const Ctrades = await Trade.sum('amount', { where: { user_id: userId, status: "Complete" } }) || 0;
    // console.log(totalCommission,buyFunds, investment,totalWithdraw,Ctrades, Rtrades);
    const availableBal = totalCommission + buyFunds + Ctrades - totalWithdraw - investment - Rtrades;

    return res.status(200).json({
      success: true,
      AvailBalance: availableBal.toFixed(2),
      message: "Amount fetched successfully!"
    });

  } catch (error) {
    console.error("Something went wrong:", error);
    return res.status(200).json({ success: false, message: "Internal Server Error" });
  }
};

const getAvailableBalance = async (userId) => {
  if (!userId) {
    throw new Error("User not authenticated");
  }

  const user = await User.findOne({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  const totalCommission = await Income.sum('comm', { where: { user_id: userId } }) || 0;
  const buyFunds = await BuyFund.sum('amount', { where: { user_id: userId } }) || 0;
  const investment = await Investment.sum('amount', { where: { user_id: userId } }) || 0;
  const totalWithdraw = await Withdraw.sum('amount', { where: { user_id: userId } }) || 0;
  const Rtrades = await Trade.sum('amount', { where: { user_id: userId, status: "Running" } }) || 0;
  const Ctrades = await Trade.sum('amount', { where: { user_id: userId, status: "Complete" } }) || 0;

  const availableBal = totalCommission + buyFunds + Ctrades - totalWithdraw - investment - Rtrades;

  return parseFloat(availableBal.toFixed(2));
};
//   const availbalance = async (req, res) => { 
//     try {
//       const userId = req.user?.id;

//       if (!userId) {
//         return res.status(401).json({ message: "User not authenticated!" });
//       }

//       const user = await User.findOne({ where: { id: userId } });

//       if (!user) {
//         return res.status(404).json({ message: "User not found!" });
//       }
//       const totalCommission = await Income.sum('comm', { where: { user_id: userId } }) || 0;   
//       if (totalCommission <= 0) {
//         return res.json({ message: "You don't have enough balance to withdraw." });
//       }
//       const totalWithdraw = await Withdraw.sum('amount', { where: { user_id: userId } }) || 0;
//       const availableBal = totalCommission - totalWithdraw;

//       return res.status(200).json({
//         success: true,
//         AvailBalance: availableBal.toFixed(2),
//         message: "Amount fetched successfully!"
//       });

//     } catch (error) {
//       console.error("Something went wrong:", error);
//       return res.status(500).json({ message: "Internal Server Error" });
//     }
//   };


const getDirectTeam = async (req, res) => {
  try {
    const loginUserId = req.user.id; // Assuming you are using JWT middleware and user info is available in req.user

    const directTeam = await User.findAll({
      where: { sponsor: loginUserId },
      attributes: ['id', 'name', 'username', 'email', 'phone', 'sponsor'],
      order: [['id', 'DESC']]
    });

    res.status(200).json({
      status: true,
      message: 'Direct team fetched successfully',
      data: directTeam
    });
  } catch (error) {
    console.error("Error fetching direct team:", error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch direct team',
      error: error.message
    });
  }
};

const fetchTeamRecursive = async (userId, allMembers = []) => {
  const directMembers = await User.findAll({
    where: { sponsor: userId },
    attributes: ['id', 'name', 'username', 'email', 'phone', 'sponsor','active_status']
  });

  for (const member of directMembers) {
    allMembers.push(member);
    await fetchTeamRecursive(member.id, allMembers);
  }

  return allMembers;
};

const directIncome = async (userId, plan, amount) => {
  try {
    if (!userId) {
      return;
    }
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return;
    }
    const sponsor = await User.findOne({ where: { id: user.sponsor } });
    if (!sponsor) {
      return;
    }
    const direct = plan / 2;
    await Income.create({
      user_id: sponsor.id,
      amt: amount,
      comm: direct,
      remarks: "Direct Income",
      ttime: new Date(),
      level: 0,
    });

  } catch (error) {
    console.error("Server Error in directIncome:", error.message);
  }
};


const levelTeam = async (req, res) => {
  try {
    const userId = req.user.id; // from JWT token

    if (!userId) {
      return res.status(200).json({ success: false, error: "Unauthorized!" });
    }

    // Fetch all team recursively
    const team = await fetchTeamRecursive(userId);

    return res.status(200).json({
      message: "Team fetched successfully!",
      totalMembers: team.length,
      team
    });

  } catch (error) {
    console.error("Error fetching team:", error.message);
    return res.status(200).json({ success: false, error: "Server Error", details: error.message });
  }
};

const direcTeam = async (req, res) => {
  try {
    const userId = req.user.id; // from JWT token

    if (!userId) {
      return res.status(200).json({ success: false, error: "Unauthorized!" });
    }

    // Fetch all team recursively
    const team = await User.findAll({ where: { sponsor: userId } });
    return res.status(200).json({
      message: "Team fetched successfully!",
      totalMembers: team.length,
      team
    });

  } catch (error) {
    console.error("Error fetching team:", error.message);
    return res.status(200).json({ success: false, error: "Server Error", details: error.message });
  }
};

const fetchwallet = async (req, res) => {
  // Construct the URL  
  try {
    const user = req.user;
    if (!user) {
      return res.json(message, "user not Authancate");
    }
    const refid = user.username;
    const currency = req.query.type || 'bep20'; // default to bep20
    const address = currency === 'trc20'
      ? 'TJPhCR5fbJH9fS7ubEQz59FQ4hLbWd9jAh'
      : '0xfff46712792FFeb9f93c530d2413fb99C67332b7';
    const apiUrl = `https://api.cryptapi.io/${currency}/usdt/create/?callback=https://api.aironetwork.in/api/auth/dynamic-upi-callback?refid=${refid}&address=${address}&pending=0&confirmations=1&email=rameshkashyap8801@gmail.com&post=0&priority=default&multi_token=0&multi_chain=0&convert=0;`

    // Call the external API
    const response = await axios.get(apiUrl);
    delete response.data.callback_url;
    //   console.log("Wallet Data:", response.data);
    if (response.data.status === "success") {
      return res.status(200).json({
        success: true,
        data: response.data
      });
    } else {
      return res.json({
        success: false,
        message: "Failed to create wallet address",
        data: response.data
      });
    }

  } catch (error) {
    console.error("Error calling external API:", error.response?.data || error.message);
    return res.status(200).json({ success: false, message: "Internal Server Error" });
  }
};

const dynamicUpiCallback = async (req, res) => {
  console.log(req.query);
  try {
    const queryData = req.query;
    console.log('Incoming callback data:', JSON.stringify(queryData));
    // Save raw JSON


    const validAddresses = [
      "0xfff46712792FFeb9f93c530d2413fb99C67332b7",
      "TJPhCR5fbJH9fS7ubEQz59FQ4hLbWd9jAh"
    ];
    if (
      validAddresses.includes(queryData.address_out) &&
      queryData.result === "sent" &&
      ['bep20_usdt', 'trc20_usdt'].includes(queryData.coin)
    ) {
      const txnId = queryData.txid_in;
      const userName = queryData.refid;

      const existingInvestment = await BuyFund.findOne({ where: { txn_no: txnId } });
      if (!existingInvestment) {
        // console.log(Processing new transaction: ${txnId} for user: ${userName});

        const amount = parseFloat(queryData.value_coin).toFixed(2);
        const blockchain = queryData.coin === 'bep20_usdt' ? 'USDT_BSC' : 'USDT_TRON';

        const user = await User.findOne({ where: { username: userName } });
        if (!user) {
          return res.json({
            message: 'User not found',
            status: false
          });
        }
        if (user) {
          await User.increment({ usdt: amount }, { where: { id: user.id } })
        }
        const now = new Date();
        const invoice = Math.floor(Math.random() * (9999999 - 1000000 + 1)) + 1000000;

        await BuyFund.create({
          txn_no: txnId,
          user_id: user.id,
          user_id_fk: user.username,
          amount: amount,
          type: blockchain,
          status: 'Approved',
          bdate: now,
        });

        // ✅ Update usdtBalance in users table
        const newBalance = parseFloat(user.usdtBalance || 0) + parseFloat(amount);
        await user.update({ usdtBalance: newBalance });
      }
    }

    return res.json({
      message: 'Callback processed',
      status: true
    });
  } catch (err) {
    console.error('UPI Callback Error:', err.message);
    return res.json({
      message: 'Failed',
      status: false
    });
  }
};



const withfatch = async (req, res) => {
  try { 
    const userId = req.user?.id;
    if (!userId) {
      return res.status(200).json({ success: false, message: "User not authenticated!" });
    }
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(200).json({ success: false, message: "User not found!" });
    }
    //   const amount = parseFloat(amount);
    return res
      .status(200).json({ success: true, data: user, message: "Amount fetch successfully!" });
  } catch (error) {
    console.error("Something went wrong:", error);
    return res.status(200).json({ success: false, message: "Internal Server Error" });
  }
};
const Cwithdarw = async (req, res) => {
  const { amount, currency, network, wallet } = req.body;

  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(200).json({ success: false, message: "User not authenticated!" });
    }

    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(200).json({ success: false, message: "User not found!" });
    }

    //   const amount = parseFloat(amount);
    if (amount <= 0) {
      return res.json({ message: "Invalid withdrawal amount!" });
    }
    if (currency === "USDT") {
      if (user.usdt < amount) {
        return res.json({ message: "Insufficient USDT balance!" });
      }
      await User.update(
        { usdt: user.usdt - amount },
        { where: { id: userId } }
      );

    } else if (currency === "AIRO") {
      if (user.airo < amount) {
        return res.json({ message: "Insufficient AIRO balance!" });
      }
      await User.update(
        { airo: user.airo - amount },
        { where: { id: userId } }
      );
    } else {
      return res.json({ message: "Unsupported currency!" });
    }
    const cutAmount = (amount / 100) * 5; // 5% charge
    const payable = amount - cutAmount;
    await Withdraw.create({
      user_id: userId,
      amount: amount,
      payable_amt: payable,
      charge: cutAmount,
      payment_mode: currency,
      account: wallet,
      network,
    });

    return res
      .status(200).json({ message: "Withdrawal request submitted successfully!" });
  } catch (error) {
    console.error("Something went wrong:", error);
    return res.status(200).json({ success: false, message: "Internal Server Error" });
  }
};

const withreq = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(200).json({ success: false, message: "User not authenticated!" });
    }

    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(200).json({ success: false, message: "User not found!" });
    }
    //   const amount = parseFloat(amount);
    return res
      .status(200).json({ success: true, trc20: user.usdtTrc20, bep20: user.usdtBep20 });
  } catch (error) {
    console.error("Something went wrong:", error);
    return res.status(200).json({ success: false, message: "Internal Server Error" });
  }
};

const sendotp = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(200).json({ success: false, message: "User not authenticated!" });
    }

    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(200).json({ success: false, message: "User not found!" });
    }

    const email = user.email;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const created_at = new Date();
    const [existing] = await sequelize.query(
      'SELECT * FROM password_resets WHERE email = ?',
      {
        replacements: [email],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (existing) {
      await sequelize.query(
        'DELETE FROM password_resets WHERE email = ?',
        {
          replacements: [email],
          type: sequelize.QueryTypes.DELETE,
        }
      );
    }
    await sequelize.query(
      'INSERT INTO password_resets (email, token, created_at) VALUES (?, ?, ?)',
      {
        replacements: [email, otp, created_at],
        type: sequelize.QueryTypes.INSERT,
      }
    );
    return res.status(200).json({ success: true, message: "OTP sent successfully" });

  } catch (error) {
    console.error("Something went wrong:", error);
    return res.status(200).json({ success: false, message: "Internal Server Error" });
  }
};

const processWithdrawal = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { wallet, amount, verificationCode, type } = req.body;

    if (!userId) {
      return res.status(200).json({ success: false, message: "User not authenticated!" });
    }

    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(200).json({ success: false, message: "User not found!" });
    }
    const [otpRecord] = await sequelize.query(
      'SELECT * FROM password_resets WHERE email = ? AND token = ? ORDER BY created_at DESC LIMIT 1',
      {
        replacements: [user.email, verificationCode],
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (!otpRecord) {
      return res.json({ message: "Invalid or expired OTP!" });
    }
    const availableBal = await getAvailableBalance(userId);

    if (parseFloat(amount) > availableBal) {
      return res.json({ message: "Insufficient balance!" });
    }
    await Withdraw.create({
      user_id: userId,
      user_id_fk: user.username,
      amount: parseFloat(amount),
      status: 'pending',
      account: wallet,
      payment_mode: type,
    });

    return res.status(200).json({
      success: true,
      message: "Withdrawal request submitted successfully!"
    });

  } catch (error) {
    console.error("Something went wrong:", error);
    return res.status(200).json({ success: false, message: "Internal Server Error" });
  }
};

const fetchserver = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(200).json({ success: false, message: "User not authenticated!" });
    }
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(200).json({ success: false, message: "User not found!" });
    }
    //   const amount = parseFloat(amount);
    const server = await Server.findAll();
    const plans = await Investment.findAll({ where: { user_id: userId } });
    return res.status(200).json({ success: true, server: server, plans: plans });
  } catch (error) {
    console.error("Something went wrong:", error);
    return res.status(200).json({ success: false, message: "Internal Server Error" });
  }
};

const myLevelTeam = async (userId, level = 3) => {
  let arrin = [userId];
  let ret = {};
  let i = 1;

  while (arrin.length > 0) {
    const allDown = await User.findAll({
      attributes: ['id'],
      where: { sponsor: { [Op.in]: arrin } }
    });

    if (allDown.length > 0) {
      arrin = allDown.map(user => user.id);
      ret[i] = arrin;
      i++;
      if (i > level) break;
    } else {
      arrin = [];
    }
  }
  return Object.values(ret).flat();
};

const submitserver = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(200).json({ success: false, message: "User not authenticated!" });
    }
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(200).json({ success: false, message: "User not found!" });
    }
    const { plan, amount, period, period_end, days } = req.body;
    const availableBal = await getAvailableBalance(userId);

    if (parseFloat(availableBal) < parseFloat(plan)) {
      return res.json({ success: false, message: "Insufficient balance!" });
    }
    const planRequirements = {
      0: "null",
      5: { direct: 2, team: 5 },
      10: { direct: 5, team: 15 },
      50: { direct: 10, team: 30 },
      120: { direct: 12, team: 50 },
      340: { direct: 15, team: 80 }
    };

    const { direct: requiredDirect, team: requiredTeam } = planRequirements[plan];

    const directUsers = await User.findAll({
      where: { sponsor: userId },
      attributes: ['id']
    });

    const teamMembers = await myLevelTeam(userId);

    if (directUsers.length < requiredDirect) {
      return res.status(200).json({
        success: false,
        message: `You need at least ${requiredDirect} direct users to purchase this plan. Currently, you have ${directUsers.length} direct users.`
      });
    }

    if (teamMembers.length < requiredTeam) {
      return res.status(200).json({
        success: false,
        message: `You need at least ${requiredTeam} total team members to purchase this plan. Currently, you have ${teamMembers.length} team members.`
      });
    }
    const checkserver = await Investment.findOne({
      where: {
        plan: plan,
        user_id: userId
      }
    });
    if (checkserver && checkserver.plan === plan) {
      return res.status(200).json({ success: false, message: "You can't buy this Server again!" });
    }
    const serverhash = crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);

    const server = await Investment.create({
      user_id: userId,
      plan: plan,
      invest_amount: amount,
      period: period,
      period_end: period_end,
      amount: plan,
      serverhash: serverhash,
      days: days,
      sdate: new Date()
    });

    updateUserStatus(user);

    await directIncome(userId, parseFloat(plan), parseFloat(plan));
    return res.status(200).json({ success: true, server: server });

  } catch (error) {
    console.error("Something went wrong:", error);
    return res.status(200).json({ success: false, message: "Internal Server Error" });
  }
};

const { Op } = require("sequelize");

const fetchrenew = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(200).json({ success: false, message: "User not authenticated!" });
    }

    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(200).json({ success: false, message: "User not found!" });
    }

    const investments = await Investment.findAll({
      where: {
        user_id: userId,
        plan: { [Op.ne]: 0 }
      },
      attributes: ['serverhash', 'plan', 'sdate', 'amount']
    });

    const uniquePlans = [...new Set(investments.map(inv => inv.plan))];
    const servers = await Server.findAll({
      where: {
        plan: { [Op.in]: uniquePlans }
      },
      attributes: ['plan', 'days']
    });

    const serverDaysMap = {};
    servers.forEach(server => {
      serverDaysMap[server.plan] = server.days;
    });

    const now = new Date();
    const expiredInvestments = investments.filter(inv => {
      const sdate = new Date(inv.sdate);
      const planDays = serverDaysMap[inv.plan] || 0;
      const diffInDays = Math.floor((now - sdate) / (1000 * 60 * 60 * 24));
      return diffInDays > planDays;
    });

    return res.status(200).json({ success: true, server: expiredInvestments });
  } catch (error) {
    console.error("Something went wrong:", error);
    return res.status(200).json({ success: false, message: "Internal Server Error" });
  }
};



const renewserver = async (req, res) => {
  // console.log(req.body);
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(200).json({ success: false, message: "User not authenticated!" });
    }

    const { serverhash, amount, plan } = req.body;

    if (!serverhash || !amount) {
      return res.json({ message: "Missing serverhash or amount!" });
    }

    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(200).json({ success: false, message: "User not found!" });
    }

    // Check user balance
    const availableBal = await getAvailableBalance(userId);
    if (parseFloat(availableBal) < parseFloat(amount)) {
      return res.json({ success: false, message: "Insufficient balance!" });
    }

    // Find server
    const server = await Investment.findOne({
      where: {
        serverhash: serverhash,
        user_id: userId
      }
    });

    if (!server) {
      return res.status(200).json({ success: false, message: "Server not found!" });
    }

    // Update server sdate to current time
    server.sdate = new Date();
    await Investment.increment(
      { amount: parseFloat(amount) },
      { where: { serverhash, user_id: userId } }
    );

    // server.invest_amount = parseFloat(server.invest_amount) + parseFloat(amount);
    await server.save();

    await directIncome(userId, parseFloat(amount), parseFloat(amount));

    return res.status(200).json({ success: true, message: "Server renewed successfully", server });

  } catch (error) {
    console.error("Something went wrong:", error);
    return res.status(200).json({ success: false, message: "Internal Server Error" });
  }
};

const fetchservers = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(200).json({ success: false, message: "User not authenticated!" });
    }
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(200).json({ success: false, message: "User not found!" });
    }

    const blockedTrades = await Trade.findAll({
      where: {
        user_id: userId,
        plan: 0
      },
      attributes: ['selectedServer']
    });

    const blockedServerHashes = blockedTrades.map(trade => trade.selectedServer);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const server = await Investment.findAll({
      where: {
        user_id: userId,
        serverhash: {
          [Op.notIn]: blockedServerHashes
        },
        sdate: {
          [Op.gte]: thirtyDaysAgo // ✅ Newer than 30 days ag
        }
      },
      order: [
        ['sdate', 'DESC']
      ],
      limit: 5,
      attributes: ['serverhash', 'plan', 'sdate', 'invest_amount', 'amount', 'period', 'period_end'],
    });

    return res.status(200).json({
      success: true,
      server
    });
  } catch (error) {
    console.error("Something went wrong:", error);
    return res.status(200).json({ success: false, message: "Internal Server Error" });
  }
};

const sendtrade = async (req, res) => {
  // console.log(req.body);
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({ message: "User not authenticated!" });
    }
    const { symbol, selectedServer, amount, period, buyInsurance, plan } = req.body.postData;
    if (!selectedServer || !amount) {
      return res.json({ message: "Missing selectedServer or amount!" });
    }
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.json({ message: "User not found!" });
    }
    const availableBal = await getAvailableBalance(userId);
    if (parseFloat(availableBal) < parseFloat(amount)) {
      return res.json({ success: false, message: "Insufficient balance!" });
    }
    const server = await Investment.findOne({
      where: {
        serverhash: selectedServer,
        user_id: userId
      }
    });

    if (!server) {
      return res.status(200).json({ success: false, message: "Server not found!" });
    }

    let minAmount = 0;

    if (plan == 0 || plan == 5) {
      minAmount = 10;  // Plan 0, 'free' or 5 requires minimum $10
    } else if (plan == 10) {
      minAmount = 100;  // Plan 10 requires minimum $100
    } else if (plan == 50) {
      minAmount = 500;  // Plan 50 requires minimum $500
    } else if (plan == 120) {
      minAmount = 2500;  // Plan 120 requires minimum $2500
    } else if (plan == 340) {
      minAmount = 10000;  // Plan 340 requires minimum $10000
    } else {
      return res.json({ success: false, message: "Invalid plan amount!" });
    }

    // Ensure the amount is greater than the required minimum for the plan
    if (parseFloat(amount) < minAmount) {
      return res.json({ success: false, message: 'The amount should be greater than or equal to $${minAmount} for this plan.' });
    }


    const now = new Date();
    const buyser = await Trade.findAll({
      where: {
        selectedServer: selectedServer,
        user_id: userId,
        endtime: {
          [Op.gt]: now,
        }
      }
    });
    if (buyser.length > 0) {
      return res.status(200).json({ success: false, message: "This server is already running!" });
    }
    server.sdate = new Date();
    const end = new Date(now.getTime() + parseFloat(period) * 60 * 60 * 1000);
    await Trade.create({
      user_id: userId,
      currency: symbol,
      selectedServer,
      amount,
      period,
      plan,
      insurance: buyInsurance,
      status: 'Running',
      entrytime: now,
      endtime: end,
    });

    return res.status(200).json({ success: true, message: "Server renewed successfully", server });

  } catch (error) {
    console.error("Something went wrong:", error);
    return res.status(200).json({ success: false, message: "Internal Server Error" });
  }
};

const runingtrade = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(200).json({ success: false, message: "Unauthorized user" });
    }
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(200).json({ success: false, message: "User not found!" });
    }
    const now = new Date();

    const expiredTrades = await Trade.findAll({
      where: {
        user_id: userId,
        endtime: {
          [Op.lt]: now // less than current time
        }
      }
    });
    const runingTrades = await Trade.findAll({
      where: {
        user_id: userId,
        endtime: { [Op.gt]: now }
      }
    });

    return res.status(200).json({ success: true, runingTrades, expiredTrades });
  } catch (error) {
    console.error("Something went wrong:", error);
    return res.status(200).json({ success: false, message: "Internal Server Error" });
  }
};

const serverc = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized user" });
    }

    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }

    // ✅ Corrected the Income sum query
    const serverInc = await Income.sum('comm', {
      where: { user_id: userId, remarks: "Direct Income" },
    });

    return res.status(200).json({
      success: true,
      totalIncome: serverInc || 0,
    });

  } catch (error) {
    console.error("❌ Internal Server Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const saveWalletAddress = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { address, verificationCode, networkType } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated!" });
    }

    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    // Verify OTP from password_resets table
    const [otpRecord] = await sequelize.query(
      'SELECT * FROM password_resets WHERE email = ? AND token = ? ORDER BY created_at DESC LIMIT 1',
      {
        replacements: [user.email, verificationCode],
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired verification code!" });
    }

    const type = networkType?.toLowerCase().trim();

    // Compare current address with saved one
    if (type === "erc20") {
      if (user.usdtBep20 === address) {
        return res.status(200).json({ message: "This ERC20 address is already saved.", alreadySaved: true });
      }
      user.usdtBep20 = address;
    } else if (type === "trc20") {
      if (user.usdtTrc20 === address) {
        return res.status(200).json({ message: "This TRC20 address is already saved.", alreadySaved: true });
      }
      user.usdtTrc20 = address;
    } else {
      return res.status(400).json({ message: "Invalid network type!" });
    }

    await user.save();

    return res.status(200).json({ success: true, message: "Address saved successfully!" });

  } catch (error) {
    console.error("Error saving wallet address:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};


const InvestHistory = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated!" });
    }
    const buy_funds = await BuyFund.findAll({
      where: { user_id: userId }, // Filter by user_id (logged-in user's ID)
      order: [['created_at', 'DESC']], // Optional: Order investments by most recent first
    });
    // console.log("i am sach",buy_funds);
    if (!buy_funds) {
      return res.status(404).json({ message: "No investments found for this user!" });
    }

    // Send the fetched investment data in the response
    return res.status(200).json({
      success: true,
      buy_funds,
    });

  } catch (error) {
    console.error("Error in fetching investment data:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const withdrawHistory = async (req, res) => {
  try {
    // Get user ID from authenticated user (authMiddleware will attach it)
    const userId = req.user?.id;

    // Debugging: Log the user data to check if it's properly attached to the request
    // console.log("Authenticated user:", req.user);

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated!" });
    }

    // Fetch withdraws data for the logged-in user
    const withdraws = await Withdraw.findAll({
      where: { user_id: userId }, // Filter by user_id (logged-in user's ID)
      // attributes: ['created_at', 'payable_amt', 'payment_mode', 'txn_id', 'status'], // Specify the fields you want to fetch
      order: [['created_at', 'DESC']], // Optional: Order withdraws by most recent first
    });

    if (!withdraws || withdraws.length === 0) {
      return res.status(404).json({ message: "No withdraw found for this user!" });
    }

    // Send the fetched investment data in the response

    return res.status(200).json({
      success: true,
      withdraws,
    });

  } catch (error) {
    console.error("Error in fetching withdraw data:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const ChangePassword = async (req, res) => {
  try {
    const { password, password_confirmation, verification_code } = req.body;

    if (!password || !password_confirmation || !verification_code) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    if (password !== password_confirmation) {
      return res.status(400).json({ message: "Passwords do not match!" });
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

    // Step 3: Hash and update password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.PSR = password;
    await user.save();

    // Step 4: Delete the used token from password_resets table
    await sequelize.query(
      'DELETE FROM password_resets WHERE token = ?',
      {
        replacements: [verification_code],
        type: sequelize.QueryTypes.DELETE
      }
    );

    return res.status(200).json({
      success: true,
      message: "Password changed successfully!"
    });

  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// get user details 
const getUserDetails = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated!" });
    }

    const user = await User.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    return res.status(200).json({
      id: user.id,
      username: user.username,
      name: user.name, // Assuming your model has a 'name' field
      email: user.email, // Assuming 'email' field exists in the user model
      bep20: user.usdtTrc20,  // Fetching and including 'bep20' address
      trc20: user.usdtBep20,
      message: "User details fetched successfully"
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const PaymentPassword = async (req, res) => {
  try {
    const { password, password_confirmation, verification_code } = req.body;

    if (!password || !password_confirmation || !verification_code) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    if (password !== password_confirmation) {
      return res.status(400).json({ message: "Passwords do not match!" });
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

    // Step 3: Hash and update password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.tpassword = hashedPassword;
    user.TPSR = password;
    await user.save();

    // Step 4: Delete the used token from password_resets table
    await sequelize.query(
      'DELETE FROM password_resets WHERE token = ?',
      {
        replacements: [verification_code],
        type: sequelize.QueryTypes.DELETE
      }
    );

    return res.status(200).json({
      success: true,
      message: "Tpassword changed successfully!"
    });

  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


const tradeinc = async (req, res) => {
  try {
    const { tradeIds } = req.body;
    const incomes = await Income.findAll({
      where: {
        user_id_fk: tradeIds,
        remarks: "Trade Income"
      }
    });
    res.status(200).json({ success: true, incomes });
  } catch (error) {
    console.error("Error fetching trade incomes:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


const totalRef = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized user" });
    }

    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }

    const serverRef = await Income.sum('comm', {
      where: {
        user_id: userId,
        remarks: {
          [Op.in]: ['Direct Income', 'ROI Income'],
        },
      },
    })

    return res.status(200).json({
      success: true,
      totalIncome: serverRef || 0,
    });

  } catch (error) {
    console.error("❌ Internal Server Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const updateUserStatus = async (user) => {
  try {
    if (user && user.status === 'Pending') {
      await User.update(   
        { status: 'Active' },
        { where: { id: user.id } }
      );
      // console.log("User status updated to Active");
    }
  } catch (error) {
    console.error("Failed to update user status:", error);
  }
};

module.exports = { levelTeam, direcTeam,getDirectTeam, fetchwallet, dynamicUpiCallback, available_balance, withfatch, withreq, sendotp, processWithdrawal, fetchserver, submitserver, getAvailableBalance, fetchrenew, renewserver, fetchservers, sendtrade, runingtrade, serverc, tradeinc, InvestHistory, withdrawHistory, ChangePassword, saveWalletAddress, getUserDetails, PaymentPassword, totalRef };

