const express = require('express');
const router = express.Router();
const authController = require('../controller/AuthController');
 const UserController = require('../controller/userController');
 const transactionController = require('../controller/transactionController');
 const TaskController = require('../controller/TaskController');
const cronController = require('../cron/cronController');


const authMiddleware = require("../middleware/authMiddleware"); // JWT Auth Middleware
const TeamController = require("../controller/TeamController"); 
const User = require('../models/User');

router.get('/generateRoiIncome', cronController.generateRoiIncome);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.post('/sendForgotOtp', authController.sendForgotOtp);
router.get('/', (req, res) => {
  res.json({ message: 'Welcome to the authentication API' });
});                             
router.get('/user', authMiddleware, UserController.getUserDetails);
router.get('/levelteam',  authMiddleware,UserController.levelTeam);
router.get('/directeam',  authMiddleware,UserController.direcTeam);
router.get('/fetchwallet', authMiddleware, UserController.fetchwallet);
router.get('/dynamic-upi-callback', UserController.dynamicUpiCallback);
router.get('/availbal', authMiddleware, UserController.available_balance);
router.get('/withreq', authMiddleware, UserController.withreq);
router.post('/sendotp', authMiddleware, UserController.sendotp);
router.post('/process-withdrawal', authMiddleware, UserController.processWithdrawal);
router.get('/fetchserver', authMiddleware, UserController.fetchserver);
router.post('/submitserver', authMiddleware, UserController.submitserver);
router.get('/fetchrenew', authMiddleware, UserController.fetchrenew);
router.post('/renew-server', authMiddleware, UserController.renewserver);
router.get('/investments', authMiddleware, UserController.InvestHistory);
router.get('/withdraw-history', authMiddleware, UserController.withdrawHistory);
router.post('/changePassword', authMiddleware, UserController.ChangePassword);

router.get('/fetchservers', authMiddleware, UserController.fetchservers);
router.post('/save-address/:networkType', authMiddleware, UserController.saveWalletAddress);

router.get('/getUserHistory', authMiddleware, transactionController.getUserHistory);
router.get('/getDirectTeam', authMiddleware, UserController.getDirectTeam);

router.post('/sendtrade', authMiddleware, UserController.sendtrade);
router.get('/runingtrade', authMiddleware, UserController.runingtrade);
// router.get('/Getinvate', authMiddleware, TeamController.Getinvate);
router.get("/team", authMiddleware ,TeamController.getTeam);
// router.get('/list', authMiddleware,TeamController.listUsers);
router.get('/serverc', authMiddleware, UserController.serverc);
router.get('/totalRef', authMiddleware, UserController.totalRef);
router.post('/getTradeIncomes', authMiddleware, UserController.tradeinc);
router.get('/buyFund', authMiddleware, UserController.buyFund);
router.post('/Deposit', authMiddleware, UserController.Deposit);
router.post('/updateProfile', authMiddleware, UserController.updateProfile);
router.get('/earning', authMiddleware, UserController.Earning);
// router.post('/register', (req, res) => {
//   res.json({ message: 'Welcome to regiset' });
// });

router.get('/getTasks', authMiddleware,TaskController.getTasks);
router.post('/startTask', authMiddleware, TaskController.startTask);
router.post('/claimTask', authMiddleware ,TaskController.claimTask);

// router.post('/connect', AuthController.otp);
router.get('/baycoin', authMiddleware, TaskController.daycoin);
router.get('/claim-day', authMiddleware , TaskController.claimday);
router.post('/claim-reward',authMiddleware,TaskController.claimtoday);

module.exports = router;
