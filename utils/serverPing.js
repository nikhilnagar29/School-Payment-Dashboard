/**
 * Server ping utility to keep the application active
 * This can be scheduled to run at regular intervals to prevent the server from sleeping
 */
const https = require('https');
const http = require('http');

/**
 * Ping the server to keep it alive
 * @param {string} url - The URL to ping
 * @param {number} interval - The interval in milliseconds (default: 5 minutes)
 * @returns {Object} - Timer object that can be cleared if needed
 */
const startPinging = (url, interval = 5 * 60 * 1000) => {
  // Validate URL
  if (!url) {
    console.error('❌ Server ping URL is required');
    return null;
  }

  console.log(`🔄 Starting server ping for ${url} every ${interval/1000} seconds`);
  
  // Set up the ping interval
  const timer = setInterval(() => {
    pingServer(url);
  }, interval);

  // Do an initial ping immediately
  pingServer(url);
  
  return timer;
};

/**
 * Ping a server once
 * @param {string} url - The URL to ping
 */
const pingServer = (url) => {
  // Determine if we need http or https
  const protocol = url.startsWith('https') ? https : http;
  
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - 🏓 Pinging server at ${url}`);
  
  const req = protocol.get(url, (res) => {
    if (res.statusCode === 200) {
      console.log(`${timestamp} - ✅ Server ping successful (${res.statusCode})`);
    } else {
      console.error(`${timestamp} - ⚠️ Server ping returned status code: ${res.statusCode}`);
    }
    
    // Read data to properly complete the request
    res.on('data', () => {});
  });
  
  req.on('error', (error) => {
    console.error(`${timestamp} - ❌ Server ping failed: ${error.message}`);
  });
  
  // Set timeout to prevent hanging
  req.setTimeout(10000, () => {
    console.error(`${timestamp} - ⏱️ Server ping timed out after 10 seconds`);
    req.destroy();
  });
  
  req.end();
};

/**
 * Stop the pinging interval
 * @param {Object} timer - The timer object returned by startPinging
 */
const stopPinging = (timer) => {
  if (timer) {
    clearInterval(timer);
    console.log('🛑 Server ping stopped');
  }
};

module.exports = {
  startPinging,
  pingServer,
  stopPinging
}; 