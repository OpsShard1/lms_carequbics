require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Logging helper
function logError(message) {
  const logPath = path.join(__dirname, 'server_error.log');
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
}

// Global error handlers
process.on('uncaughtException', (err) => {
  logError(`Uncaught Exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection: ${reason}`);
});

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://lms.carequbics.com',
  'https://lmstest.carequbics.com',
  'https://lms.carequbics.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Database connection
const db = require('./database/connection');

// Test database connection on startup
db.testConnection();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/schools', require('./routes/schools'));
app.use('/api/centers', require('./routes/centers'));
app.use('/api/users', require('./routes/users'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/students', require('./routes/students'));
app.use('/api/timetables', require('./routes/timetables'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/staff-assignments', require('./routes/staff-assignments'));
app.use('/api/teacher-assignments', require('./routes/teacher-assignments'));
app.use('/api/school-assignments', require('./routes/school-assignments'));
app.use('/api/curriculum', require('./routes/curriculum'));
app.use('/api/school-curriculum', require('./routes/school-curriculum'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/fees', require('./routes/fees'));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'LMS API is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  logError(`Error: ${err.message}\n${err.stack}`);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`LMS API running on port ${PORT}`);
});
