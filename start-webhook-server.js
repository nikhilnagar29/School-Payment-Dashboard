/**
 * This script starts both the Express server and ngrok tunnel
 * It's a stable solution for webhook testing in production
 */

const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

// Set environment variables
process.env.HOST = '0.0.0.0';
process.env.PORT = process.env.PORT || 3000;

console.log('🚀 Starting webhook server with ngrok tunnel...');
console.log(`📋 Configuration:`);
console.log(`   - Port: ${process.env.PORT}`);
console.log(`   - Host: ${process.env.HOST} (all interfaces)`);

// Start the Express server
const server = spawn('node', ['app.js'], {
  stdio: 'inherit',
  env: process.env
});

console.log('✅ Express server started');

// Wait a bit for the server to start
setTimeout(() => {
  // Start ngrok
  const tunnel = spawn('node', ['ngrok-tunnel.js'], {
    stdio: 'inherit',
    env: process.env
  });
  
  console.log('✅ Ngrok tunnel started');

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    server.kill();
    tunnel.kill();
    setTimeout(() => process.exit(0), 1000);
  });

  // Handle child process errors
  server.on('error', (err) => {
    console.error('❌ Server error:', err);
  });

  tunnel.on('error', (err) => {
    console.error('❌ Tunnel error:', err);
  });

  server.on('close', (code) => {
    console.log(`🛑 Server process exited with code ${code}`);
    tunnel.kill();
    process.exit(code);
  });

  tunnel.on('close', (code) => {
    console.log(`🛑 Tunnel process exited with code ${code}`);
    if (server.connected) {
      server.kill();
    }
    process.exit(code);
  });
}, 2000);

console.log('⏳ Waiting for server and tunnel to start...');
console.log('Press Ctrl+C to stop both server and tunnel'); 