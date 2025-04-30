/**
 * Keep-Alive Script
 * 
 * This script pings the server at regular intervals to prevent it from sleeping.
 * Can be used with process managers like PM2 or as a separate process.
 * 
 * Usage: node keepAlive.js [url] [interval_in_minutes]
 * Example: node keepAlive.js https://your-app.onrender.com 15
 */
require('dotenv').config();
const { startPinging } = require('./utils/serverPing');

// Default values
const DEFAULT_URL = process.env.BASE_URL || 'http://localhost:3000';
const DEFAULT_INTERVAL = 5; // 5 minutes

// Get URL and interval from command line args or use defaults
const url = process.argv[2] || DEFAULT_URL;
const intervalMinutes = parseInt(process.argv[3], 10) || DEFAULT_INTERVAL;
const intervalMs = intervalMinutes * 60 * 1000;

console.log(`
🔔 Keep-Alive Service Starting
==============================
URL: ${url}
Interval: ${intervalMinutes} minutes
==============================
`);

// Start pinging the server
const pingTimer = startPinging(url, intervalMs);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Keep-Alive Service stopping...');
  if (pingTimer) {
    clearInterval(pingTimer);
  }
  process.exit(0);
}); 