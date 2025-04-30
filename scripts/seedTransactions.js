/**
 * Script to seed transaction data for testing
 * Run with: node seedTransactions.js
 */

const mongoose = require('mongoose');
const Order = require('../models/order.model');
const OrderStatus = require('../models/order-status.model');
require('dotenv').config();

// MongoDB connection
mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('🔌 MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

// Sample data
const sampleSchoolIds = [
  new mongoose.Types.ObjectId(), // School 1
  new mongoose.Types.ObjectId(), // School 2
  new mongoose.Types.ObjectId(), // School 3
];

const sampleTrusteeIds = [
  new mongoose.Types.ObjectId(), // Trustee 1
  new mongoose.Types.ObjectId(), // Trustee 2
];

const paymentGateways = ['PhonePe', 'Razorpay', 'PayTM', 'GooglePay'];
const paymentModes = ['UPI', 'NetBanking', 'CreditCard', 'DebitCard', 'Wallet'];
const statuses = ['success', 'pending', 'failed'];

// Generate random number between min and max (inclusive)
const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

// Generate unique order ID
const generateOrderId = (index) => {
  const timestamp = Date.now();
  return `ORD-${timestamp}-${index}`;
};

// Generate random date within the last 30 days
const getRandomDate = () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  return new Date(thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime()));
};

// Function to create seed data
const seedData = async () => {
  try {
    // Clear existing data
    await Order.deleteMany({});
    await OrderStatus.deleteMany({});
    
    console.log('🧹 Cleared existing data');
    
    const orderPromises = [];
    const statusPromises = [];
    
    // Create 50 orders and their corresponding statuses
    for (let i = 0; i < 50; i++) {
      const schoolId = sampleSchoolIds[Math.floor(Math.random() * sampleSchoolIds.length)];
      const trusteeId = sampleTrusteeIds[Math.floor(Math.random() * sampleTrusteeIds.length)];
      const gatewayName = paymentGateways[Math.floor(Math.random() * paymentGateways.length)];
      const customOrderId = generateOrderId(i);
      
      // Create order
      const order = new Order({
        school_id: schoolId,
        trustee_id: trusteeId,
        student_info: {
          names: `Student ${i + 1}`,
          id: `ST${10000 + i}`,
          email: `student${i + 1}@example.com`
        },
        gateway_name: gatewayName,
        custom_order_id: customOrderId,
        payment_link: `https://pay.example.com/${customOrderId}`,
        created_at: getRandomDate()
      });
      
      orderPromises.push(order.save());
      
      // Will create order status after all orders are saved
      statusPromises.push(async (savedOrder) => {
        const orderAmount = getRandomInt(10000, 50000);
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        // Calculate transaction amount (sometimes less for partial payments/refunds)
        let transactionAmount = orderAmount;
        if (Math.random() > 0.8) {
          transactionAmount = Math.floor(orderAmount * 0.9); // 10% less
        }
        
        const paymentMode = paymentModes[Math.floor(Math.random() * paymentModes.length)];
        
        // Create order status
        const orderStatus = new OrderStatus({
          collect_id: savedOrder._id,
          order_amount: orderAmount,
          transaction_amount: transactionAmount,
          payment_mode: paymentMode,
          payment_details: `${paymentMode} transaction`,
          bank_reference: Math.random().toString(36).substring(2, 15),
          status: status,
          payment_message: status === 'success' ? 'Payment successful' : 
                          status === 'pending' ? 'Payment pending confirmation' : 
                          'Payment failed',
          error_message: status === 'failed' ? 'Insufficient funds' : null,
          payment_time: getRandomDate()
        });
        
        return orderStatus.save();
      });
    }
    
    // Save all orders
    const savedOrders = await Promise.all(orderPromises);
    console.log(`✅ Created ${savedOrders.length} orders`);
    
    // Save all order statuses
    const statusPromiseFns = statusPromises.map((fn, i) => fn(savedOrders[i]));
    const savedStatuses = await Promise.all(statusPromiseFns);
    console.log(`✅ Created ${savedStatuses.length} order statuses`);
    
    console.log('🌱 Seed data created successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

// Run the seeding function
seedData(); 