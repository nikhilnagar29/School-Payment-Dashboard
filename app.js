const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const { errorHandler } = require('./middlewares/error.middleware');
const { startPinging, stopPinging } = require('./utils/serverPing');

// Load environment variables
dotenv.config();

// Database connection
require('./config/mongoose-connection');

// Initialize Express app
const app = express();

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Body:', req.body);
  }
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/transactions', require('./routes/transactions.routes'));

// Home route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'School Payment & Dashboard System API',
    version: '1.0'
  });
});

// Special ping endpoint to check server health
app.get('/ping', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorHandler);

// Server
const PORT = process.env.PORT || 5000;
// Remove host binding as Render requires listening on 0.0.0.0
// const HOST = process.env.HOST || 'localhost';

// Modified to always listen on 0.0.0.0 for Render compatibility
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Server bound to interface: 0.0.0.0`);
  console.log(`API available at http://localhost:${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/api/payments/webhook`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please use a different port or close the application using this port.`);
    process.exit(1);
  } else {
    console.error('Error starting server:', err);
    process.exit(1);
  }
});

// Self-ping functionality to keep the server active
let pingTimer = null;
if (process.env.ENABLE_SELF_PING === 'true') {
  const pingUrl = process.env.PING_URL || `http://localhost:${PORT}/ping`;
  const pingInterval = parseInt(process.env.PING_INTERVAL || '5', 10) * 60 * 1000; // Default: 5 minutes
  pingTimer = startPinging(pingUrl, pingInterval);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  
  // Stop ping timer if active
  if (pingTimer) {
    stopPinging(pingTimer);
  }
  
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

module.exports = app; 