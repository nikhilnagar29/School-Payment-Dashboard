const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Order = require('../models/order.model');
const OrderStatus = require('../models/order-status.model');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
  seedData();
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function seedData() {
  try {
    // Clear existing test data
    await Order.deleteMany({ custom_order_id: /^TEST-/ });
    await OrderStatus.deleteMany({ status: { $in: ['success', 'pending', 'failed'] } });
    
    console.log('Cleared existing test data');
    
    // Create test orders
    const orders = await Order.create([
      {
        school_id: "SCHOOL-001",
        trustee_id: "TRUSTEE-001",
        student_info: {
          name: "Test Student 1",
          grade: "10th",
          id: "STD-001"
        },
        gateway_name: "PhonePe",
        payment_link: "https://test-payment.com/1",
        custom_order_id: "TEST-ORDER-001"
      },
      {
        school_id: "SCHOOL-002",
        trustee_id: "TRUSTEE-001",
        student_info: {
          name: "Test Student 2",
          grade: "11th",
          id: "STD-002"
        },
        gateway_name: "Razorpay",
        payment_link: "https://test-payment.com/2",
        custom_order_id: "TEST-ORDER-002"
      },
      {
        school_id: "SCHOOL-001",
        trustee_id: "TRUSTEE-002",
        student_info: {
          name: "Test Student 3",
          grade: "12th",
          id: "STD-003"
        },
        gateway_name: "PhonePe",
        payment_link: "https://test-payment.com/3",
        custom_order_id: "TEST-ORDER-003"
      }
    ]);
    
    console.log('Created test orders');
    
    // Create test order statuses
    const statuses = await OrderStatus.create([
      {
        collect_id: orders[0]._id,
        order_amount: 2000,
        transaction_amount: 2000,
        payment_mode: "UPI",
        payment_details: "success@ybl",
        bank_reference: "YESBNK001",
        status: "success",
        payment_message: "Payment successful",
        payment_time: new Date()
      },
      {
        collect_id: orders[1]._id,
        order_amount: 3000,
        transaction_amount: 3000,
        payment_mode: "UPI",
        payment_details: "pending@ybl",
        bank_reference: "YESBNK002",
        status: "pending",
        payment_message: "Payment initiated",
        payment_time: new Date()
      },
      {
        collect_id: orders[2]._id,
        order_amount: 4000,
        transaction_amount: 0,
        payment_mode: "UPI",
        payment_details: "failed@ybl",
        bank_reference: "YESBNK003",
        status: "failed",
        payment_message: "Payment failed",
        error_message: "Insufficient funds",
        payment_time: new Date()
      }
    ]);
    
    console.log('Created test order statuses');
    console.log('\nTest data summary:');
    console.log('Orders created:', orders.length);
    console.log('Statuses created:', statuses.length);
    console.log('\nTest order IDs:');
    orders.forEach(order => {
      console.log(`- ${order.custom_order_id}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
} 