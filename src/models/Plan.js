const { DataTypes } = require("sequelize");
const sequelize = require('../config/connectDB');

const Plan = sequelize.define(
  "plans",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    amount: { type: DataTypes.INTEGER, allowNull: true },
    days: { type: DataTypes.INTEGER, allowNull: true },
      vip: { type: DataTypes.STRING, allowNull: true },


  
  },
  {
    tableName: "plans",
    timestamps: false, // Set to true if you have createdAt/updatedAt columns
  }
);

module.exports = Plan;
