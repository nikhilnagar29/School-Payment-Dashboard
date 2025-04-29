const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const { errorHandler } = require('./middlewares/error.middleware');

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

// Error handling middleware
app.use(errorHandler);

// Server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

// Check if port is in use and exit gracefully if it is
const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Server bound to interface: ${HOST}`);
  console.log(`API available at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`Webhook endpoint: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api/payments/webhook`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please use a different port or close the application using this port.`);
    process.exit(1);
  } else {
    console.error('Error starting server:', err);
    process.exit(1);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

module.exports = app; 