const sequelize = require('../config/connectDB'); // Import Sequelize connection
const { QueryTypes } = require('sequelize');
const { Op } = require("sequelize");
const Task = require("../models/Task");
const { UserTask } = require("../models");
const User = require('../models/User');
const Income = require('../models/Income');

 const getTasks = async (req, res) => {
    try {
        const userId = req.user?.id;       
        const tasks = await Task.findAll({
                include: [{model: UserTask, as: "userTasks",
                where: { user_id :userId }, required: false,
              },
            ],
          });
          const formattedTasks = tasks.map((task) => ({
            id: task.id,
            name: task.name,
            reward: task.reward,
            icon: task.icon,
            link: task.link,
            status: task.userTasks?.length ? task.userTasks[0].status : "not_started",
            }));
          res.json(formattedTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };

const startTask = async (req, res) => {
    try {
        const userId = req.user?.id;  
        if (!userId) {
      return res.status(200).json({ success: false, message: "User not authenticated!" });
    }
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(200).json({ success: false, message: "User not found!" });
    }
    const {task_id } = req.body;
        const [userTask, created] = await UserTask.findOrCreate({
            where: { user_id: userId, task_id: task_id },
            defaults: { status: "pending" },
          });
          res.json({ message: created ? "Task started" : "Task already in progress" });
    } catch (error) {
        res.status(500).json({ error: "Error starting task" });
    }
  };

    const claimTask = async (req, res) => {
    try {
      const userId = req.user?.id;  
        if (!userId) {
      return res.status(200).json({ success: false, message: "User not authenticated!" });
    }
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(200).json({ success: false, message: "User not found!" });
    }
        const { task_id } = req.body;
        const task = await Task.findOne({ where: {id:task_id},attributes:['reward']});
        if (!task) {
            return res.status(200).json({success: false, message: "Task not found" });
        }
        const existingTask = await UserTask.findOne({ where: { task_id: task_id, status: "completed", user_id: userId} });
        if (existingTask) {
            return res.status(200).json({success: false, message: "You can't Claim Again" });
        }
        await Income.create({
            comm: task.reward,
            amt: task.reward,
            user_id:userId,
            user_id_fk: user.username,
            remarks: "Task Income",
            ttime:new Date(),            
         });
        await UserTask.update({ status: "completed", bonus: task.reward }, { where: {user_id: userId, task_id:task_id} });
        
        res.json({ message: "Task claimed successfully", Reward:task.reward });

    } catch (error) {
        res.status(500).json({ error: "Error starting task" });
    }
  };

 
    const daycoin = async (req, res) => {
    // console.log("📢 daycoin API called!"); // ✅ Logs when API is hit
    try {
        const userId = req.user?.id;
        if (!userId) {
            // console.log("❌ Unauthorized: User ID missing");
            return res.status(401).json({ message: "Unauthorized: User ID missing" });
        }
        const user = await User.findOne({ where: {id: userId } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const query = "SELECT * FROM day_coin";
        const results = await sequelize.query(query, { type: QueryTypes.SELECT });
         
        // console.log("✅ Day Coin Data Fetched:", results);
        return res.json({
            message: "Today Task Coin",
            data: results, // Send fetched data
            u_id :user.id,
        });

    } catch (error) {
        console.error("❌ Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

  const claimday = async (req,res) =>{
    try{
       const userId = req.user?.id;
       if(!userId){
        return res.json(401,'Unauthorised user');
       }        
       const user = await User.findOne({where:{id: userId}});
       if(!user){
        return res.json(401,'user not found');
       }       
    const result = await Income.findAll({where: { user_id: user.id , remarks:"Daily Income"},order: [['created_at', 'DESC']],});
      const todayr = await Income.sum('amt', {
  where: { user_id: user.id, remarks: {
      [Op.or]: ["Daily Income", "Task Income"]
    } }
});
    const lastClaimed = result.length > 0 ? result[0].created_at : null; // Extract last claimed date
        const userClaimsCount = result.length;
     return res.json({ message: "Day task Coin", data: result, userClaimsCount,lastClaimed ,todayr });
    }
    catch(error){
       return console.error(error, "Day claim failed");
    }
  }

    const claimtoday = async (req, res) => {
    // console.log("request send", req.body);   
    try {
         const userId = req.user?.id;
    const { rewardId } = req.body; // Get reward ID from request
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized user" });
    }
        // Fetch reward details from `day_coin`
        const coines = await sequelize.query(
            "SELECT * FROM day_coin WHERE id = ?",
            { replacements: [rewardId], type: sequelize.QueryTypes.SELECT }
        );
        if (!coines.length) {
            return res.status(404).json({ message: "Reward not found" });
        }
        const { coin, id} = coines[0]; // Extract coin and bundle_id
        // console.log(coin, id );
        // Fetch user details
        const user = await User.findOne({where:{id: userId}});
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const lastClaim =  await Income.findOne({where: { user_id: userId, remarks:"Daily Income"},
           order: [['created_at', 'DESC']],
        });
        if (lastClaim) {
        const today = new Date().toDateString();
        const lastClaimDate = new Date(lastClaim.created_at).toDateString();

        if (lastClaimDate === today) {
          return res.status(400).json({ message: "Reward already claimed today" });
        }
        }
        // const Dcoin = coin/100;
        const incre = await Income.create({
            comm: coin,
            amt: coin,
            user_id:userId,
            user_id_fk: user.username,
            remarks: "Daily Income",
            ttime:new Date(),            
         });
        return res.json({ success: true, message: "🎉 Reward Claimed Successfully!", Reward:coin });

    } catch (error) {
        console.error("Error in claiming reward:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


module.exports = {getTasks,startTask, claimTask, daycoin, claimday, claimtoday};