const { DataTypes } = require('sequelize');
const sequelize = require('../config/connectDB');

const Investment = sequelize.define('Investment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id_fk: { type: DataTypes.INTEGER, allowNull: true },
    plan: { type: DataTypes.STRING, allowNull: true },
    invest_amount: { type: DataTypes.INTEGER, allowNull: true },
    period: { type: DataTypes.INTEGER, allowNull: true },
    period_end: { type: DataTypes.INTEGER, allowNull: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    amount: { type: DataTypes.DOUBLE, allowNull: true },
    serverhash: { type: DataTypes.STRING, allowNull: true },
    sdate: {type: DataTypes.DATE, allowNull: true},
    days: { type: DataTypes.INTEGER, allowNull: true,},      
    payment_mode: { type: DataTypes.STRING, allowNull: true },
    active_from: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.ENUM("Active", "Pending", "Decline"), defaultValue: "Pending" },
    created_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    sdate: {
        type: DataTypes.DATE,
        allowNull: true,
    }
}, {
    tableName: 'investments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});



module.exports = Investment;