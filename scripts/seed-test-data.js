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
    await Order.deleteMany({});
    await OrderStatus.deleteMany({});
    console.log('Cleared existing test data');
    
    // Create some test orders
    const schoolId = new mongoose.Types.ObjectId();
    const trusteeId = new mongoose.Types.ObjectId();

    const orders = await Order.create([
      {
        school_id: schoolId,
        trustee_id: trusteeId,
        student_info: {
          email: 'student1@example.com',
          names: 'John Doe',
          id: 'STU101',
          class: '10A',
          roll_number: '101'
        },
        gateway_name: 'razorpay',
        payment_link: 'https://razorpay.com/pay/test-1',
        custom_order_id: 'ORDER-001'
      },
      {
        school_id: schoolId,
        trustee_id: trusteeId,
        student_info: {
          email: 'student2@example.com',
          names: 'Jane Smith',
          id: 'STU202',
          class: '11B',
          roll_number: '202'
        },
        gateway_name: 'razorpay',
        payment_link: 'https://razorpay.com/pay/test-2',
        custom_order_id: 'ORDER-002'
      },
      {
        school_id: schoolId,
        trustee_id: trusteeId,
        student_info: {
          email: 'student3@example.com',
          names: 'Bob Wilson',
          id: 'STU303',
          class: '12C',
          roll_number: '303'
        },
        gateway_name: 'razorpay',
        payment_link: 'https://razorpay.com/pay/test-3',
        custom_order_id: 'ORDER-003'
      }
    ]);
    
    console.log('Created test orders:', orders.map(o => o._id));
    
    // Create order statuses for each order
    const statuses = await OrderStatus.create([
      {
        collect_id: orders[0]._id,
        order_amount: 1000,
        transaction_amount: 1000,
        payment_mode: 'UPI',
        payment_details: {
          upi_id: 'test@upi',
          transaction_ref: 'TX001'
        },
        bank_reference: 'BANK001',
        status: 'success',
        payment_message: 'Payment successful',
        payment_time: new Date()
      },
      {
        collect_id: orders[1]._id,
        order_amount: 2000,
        transaction_amount: 2000,
        payment_mode: 'CARD',
        payment_details: {
          card_network: 'VISA',
          transaction_ref: 'TX002'
        },
        bank_reference: 'BANK002',
        status: 'pending',
        payment_message: 'Payment initiated',
        payment_time: new Date()
      },
      {
        collect_id: orders[2]._id,
        order_amount: 3000,
        transaction_amount: 0,
        payment_mode: 'NET_BANKING',
        payment_details: {
          bank_name: 'Test Bank',
          transaction_ref: 'TX003'
        },
        bank_reference: 'BANK003',
        status: 'failed',
        payment_message: 'Bank declined transaction',
        payment_time: new Date()
      }
    ]);
    
    console.log('Created test order statuses:', statuses.map(s => s._id));
    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
  }
} 