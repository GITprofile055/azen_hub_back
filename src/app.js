const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();
require('./cron/cronController')
const authRoutes = require('./routes/web');
// const userRoutes = require('./routes/userRoutes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','), // allow only specific origins
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
// app.use('/api/user', userRoutes);

// Health Check
app.get('/', (req, res) => res.send({ status: 'API is Running 🚀' }));

module.exports = app;
