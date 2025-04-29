/**
 * This script starts a stable ngrok tunnel for webhook testing
 * It's more reliable than localtunnel for production use
 */

const ngrok = require('ngrok');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

async function startNgrokTunnel() {
  try {
    console.log(`🚀 Starting ngrok tunnel to port ${PORT}...`);

    // Connect to ngrok
    const url = await ngrok.connect({
      addr: PORT,
      region: 'us',  // or 'eu', 'au', 'ap', 'sa', 'jp', 'in'
      onStatusChange: status => {
        console.log(`🔔 Ngrok Status: ${status}`);
      },
      onLogEvent: log => {
        if (log.includes('error') || log.includes('ERR')) {
          console.error(`❌ Ngrok log: ${log}`);
        }
      }
    });

    console.log(`✅ Ngrok tunnel established!`);
    console.log(`🔗 Public URL: ${url}`);
    console.log(`🔗 Webhook URL: ${url}/api/payments/webhook`);
    
    // Update environment variable
    process.env.CALLBACK_URL = `${url}/api/payments/webhook`;
    process.env.WEBHOOK_URL = url;
    console.log(`✅ Updated callback URL: ${process.env.CALLBACK_URL}`);
    console.log(`📱 This tunnel is publicly accessible to everyone`);

    // Save the URL to a file for reference
    fs.writeFileSync('webhook-url.txt', `${url}/api/payments/webhook`);
    console.log(`💾 Webhook URL saved to webhook-url.txt`);
    
    // Update .env file with the WEBHOOK_URL
    try {
      let envContent = '';
      const envPath = path.resolve('.env');
      
      // Check if .env already exists
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
        
        // Check if WEBHOOK_URL is already defined
        if (envContent.includes('WEBHOOK_URL=')) {
          // Replace existing WEBHOOK_URL
          envContent = envContent.replace(/WEBHOOK_URL=.*/g, `WEBHOOK_URL=${url}`);
        } else {
          // Add WEBHOOK_URL to existing file
          envContent += `\nWEBHOOK_URL=${url}`;
        }
      } else {
        // Create new .env file with WEBHOOK_URL
        envContent = `WEBHOOK_URL=${url}`;
      }
      
      // Write to .env file
      fs.writeFileSync(envPath, envContent);
      console.log(`💾 WEBHOOK_URL saved to .env file`);
    } catch (envError) {
      console.error(`⚠️ Error updating .env file: ${envError.message}`);
      console.log(`⚠️ Please manually set WEBHOOK_URL=${url} in your .env file`);
    }

    // Listen for process termination
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down ngrok tunnel...');
      await ngrok.kill();
      console.log('✅ Ngrok tunnel closed');
      process.exit(0);
    });

  } catch (error) {
    console.error(`❌ Error starting ngrok: ${error.message}`);
    console.log('💡 Tip: If you see "authtoken" issues, you need to sign up at ngrok.com and set your token');
    console.log('    Run: npx ngrok authtoken YOUR_AUTH_TOKEN');
    
    process.exit(1);
  }
}

startNgrokTunnel(); 