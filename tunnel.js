const localtunnel = require('localtunnel');
require('dotenv').config();

const port = process.env.PORT || 3000;
const subdomain = process.env.TUNNEL_SUBDOMAIN || 'school-payment-yadu-9876';

console.log(`Starting tunnel for port ${port} with subdomain: ${subdomain}`);

async function startTunnel() {
  try {
    console.log('Connecting to localtunnel.me...');
    
    // Configure the Express server to listen on all network interfaces (0.0.0.0)
    // This makes your local server accessible to the tunnel service
    process.env.HOST = '0.0.0.0';
    
    const tunnel = await localtunnel({ 
      port,
      subdomain,
      allow_ip: ['0.0.0.0/0'], // Allow all IPs to access the tunnel
      localhost: '0.0.0.0'     // Bind to all interfaces locally
    });

    console.log(`✅ Tunnel successfully established!`);
    console.log(`🔗 Tunnel URL: ${tunnel.url}`);
    console.log(`🔗 Webhook URL: ${tunnel.url}/api/payments/webhook`);
    
    process.env.CALLBACK_URL = `${tunnel.url}/api/payments/webhook`;
    console.log(`✅ Updated callback URL: ${process.env.CALLBACK_URL}`);
    console.log(`📱 This tunnel is now PUBLICLY accessible to everyone`);

    tunnel.on('close', () => {
      console.log('❌ Tunnel closed');
      console.log('Attempting to restart in 5 seconds...');
      setTimeout(startTunnel, 5000);
    });

    tunnel.on('error', (err) => {
      console.error('❌ Tunnel error:', err);
      console.log('Attempting to restart tunnel in 5 seconds...');
      setTimeout(startTunnel, 5000);
    });

  } catch (error) {
    console.error('❌ Failed to establish tunnel:', error.message);
    console.log('Possible reasons:');
    console.log('1. Subdomain already in use - try changing TUNNEL_SUBDOMAIN in .env');
    console.log('2. Port is not accessible - make sure your server is running');
    console.log('3. Network issues - check your internet connection');
    console.log('4. Localtunnel service might be down');
    
    console.log('Attempting to restart with a random subdomain in 10 seconds...');
    
    // Generate a random subdomain on error
    process.env.TUNNEL_SUBDOMAIN = `school-payment-${Math.random().toString(36).substring(2, 8)}`;
    console.log(`New subdomain: ${process.env.TUNNEL_SUBDOMAIN}`);
    
    setTimeout(startTunnel, 10000);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down tunnel...');
  process.exit(0);
});

startTunnel(); 