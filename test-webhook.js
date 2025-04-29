const axios = require('axios');
require('dotenv').config();

// Get order ID from command line or use the documentation's example value
const orderId = process.argv[2] || 'collect_id/transaction_id';

// Base URL - use localhost or ngrok URL
const BASE_URL = process.env.WEBHOOK_URL || 'http://localhost:3000';

async function testWebhook() {
  console.log(`🔍 Testing webhook with exact payload format from documentation`);
  
  // Create webhook payload exactly as in documentation
  const payload = {
    "status": 200,
    "order_info": {
      "order_id": orderId,
      "order_amount": 2000,
      "transaction_amount": 2200,
      "gateway": "PhonePe",
      "bank_reference": "YESBNK222",
      "status": "success",
      "payment_mode": "upi",
      "payemnt_details": "success@ybl",
      "Payment_message": "payment success",
      "payment_time": "2025-04-23T08:14:21.945+00:00",
      "error_message": "NA"
    }
  };

  try {
    console.log(`📤 Sending webhook to: ${BASE_URL}/api/payments/webhook`);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));
    
    // Send webhook request
    const response = await axios.post(`${BASE_URL}/api/payments/webhook`, payload);
    
    console.log('✅ Webhook response:', response.data);
    console.log('⚡ Status code:', response.status);
  } catch (error) {
    console.error('❌ Error sending webhook:', error.message);
    if (error.response) {
      console.error('📡 Response data:', error.response.data);
      console.error('⚠️ Status code:', error.response.status);
    }
  }
}

// Run the test
testWebhook(); 