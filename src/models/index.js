const sequelize = require('../config/connectDB');
const User = require('./User');
const UserTask = require('./UserTask');
const Task = require('./Task');


Task.hasMany(UserTask, { foreignKey: "task_id", as: "userTasks" });
UserTask.belongsTo(Task, { foreignKey: "task_id", as: "task" });
// Sync models
sequelize.sync(); // Use { force: true } only if you want to recreate tables

module.exports = { sequelize, User, Task, UserTask};