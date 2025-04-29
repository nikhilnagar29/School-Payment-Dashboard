/**
 * This script starts both the Express server and localtunnel with public access settings
 */

const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

// Set environment variables for public access
process.env.HOST = '0.0.0.0';
process.env.PORT = process.env.PORT || 3000;

console.log('🚀 Starting public server and tunnel...');
console.log(`📋 Configuration:`);
console.log(`   - Port: ${process.env.PORT}`);
console.log(`   - Host: ${process.env.HOST} (all interfaces)`);
console.log(`   - Subdomain: ${process.env.TUNNEL_SUBDOMAIN || 'school-payment-yadu-9876'}`);

// Start the Express server
const server = spawn('node', ['app.js'], {
  stdio: 'inherit',
  env: process.env
});

console.log('✅ Express server started');

// Wait a bit for the server to start
setTimeout(() => {
  // Start the tunnel
  const tunnel = spawn('node', ['tunnel.js'], {
    stdio: 'inherit',
    env: process.env
  });
  
  console.log('✅ Tunnel started');

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