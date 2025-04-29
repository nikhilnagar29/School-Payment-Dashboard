const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');

const Order = require('../models/order.model');
const OrderStatus = require('../models/order-status.model');
const WebhookLog = require('../models/webhook-log.model');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { ErrorResponse } = require('../middlewares/error.middleware');



// @desc    Create payment link
// @route   POST /api/payments/create-payment
// @access  Private/Admin/Trustee
router.post("/create-payment", protect, authorize('admin', 'trustee'), async (req, res) => {
  try {
    // 1. Get payment details from request
    const { student_info, order_amount, school_id, trustee_id } = req.body;
    
    // Use a hardcoded school ID from the example if none is provided
    // This is the school ID used in the example curl request
    const validSchoolId = process.env.SCHOOL_ID || "65b0e6293e9f76a9694d84b4";
    const finalSchoolId = school_id || validSchoolId;

    if (!student_info || !order_amount) {
      return res.status(400).json({ 
        success: false,
        error: "Missing required fields: student_info, order_amount" 
      });
    }

    // Get callback URL from environment or generate dynamically
    const baseUrl = req.get('origin') || process.env.BASE_URL || 'http://localhost:5000';
    // Use the environment variable if set, otherwise construct from base URL
    const callback_url = process.env.CALLBACK_URL || `${baseUrl}/api/payments/webhook`;
    
    // console.log('Using callback URL:', callback_url);
    
    const PG_KEY = process.env.PG_KEY;
    const API_KEY = process.env.API_KEY;

    // 2. Generate JWT signature (sign)
    const payload = { 
      school_id: finalSchoolId, 
      amount: order_amount.toString(), 
      callback_url 
    };
    
    const sign = jwt.sign(payload, PG_KEY, { algorithm: "HS256" });

    // Log the payload and sign for debugging
    // console.log('Payload:', payload);
    // console.log('Sign:', sign);

    // 3. Call external payment API
    try {
      const response = await axios.post(
        "https://dev-vanilla.edviron.com/erp/create-collect-request",
        {
          school_id: finalSchoolId,
          amount: order_amount.toString(),
          callback_url,
          sign,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`,
          },
        }
      ); 

    //   console.log('Payment API Response:', response.data);

      // 4. Save order to MongoDB
      const order = new Order({
        school_id: finalSchoolId,
        trustee_id: trustee_id || req.user.id,
        student_info,
        gateway_name: "Edviron",
        payment_link: response.data.collect_request_url,
        custom_order_id: response.data.collect_request_id,
      });
      
      await order.save();
 
      // 5. Return payment link to user

      res.status(200).json({ 
        success: true,
        collect_request_id: response.data.collect_request_id,
        payment_link: response.data.collect_request_url 
      });
    } catch (apiError) {
      console.error('API Error Details:', apiError.response?.data || 'No response data');
      
      // Special handling for Invalid Institute ID error
      if (apiError.response?.data?.message === 'Inalid Institute id') {
        return res.status(404).json({
          success: false,
          error: "Invalid school ID",
          message: "The school ID provided is not recognized by the payment gateway. Please verify the school ID."
        });
      }
      
      return res.status(500).json({
        success: false,
        error: "Payment gateway error",
        message: apiError.response?.data?.message || apiError.message
      });
    }
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ 
      success: false,
      error: "Payment creation failed",
      message: error.message
    });
  }
});

// @desc    Process payment webhook
// @route   POST /api/payments/webhook
// @access  Public
router.post("/webhook", async (req, res) => {
    let webhookLog;

    try {
      const data = req.body;
  
      // Log the incoming payload
      webhookLog = new WebhookLog({
        payload: data,
        status_code: 200,
        processed: false
      });
      await webhookLog.save();
  
      const orderInfo = data.order_info;
  
      if (!orderInfo || !orderInfo.order_id) {
        webhookLog.status_code = 400;
        await webhookLog.save();
        return res.status(200).json({
          success: false,
          error: 'Missing order_id in order_info'
        });
      }
  
      const status = orderInfo.status?.toLowerCase();
  
      if (!['success', 'pending', 'failed'].includes(status)) {
        webhookLog.status_code = 400;
        await webhookLog.save();
        return res.status(200).json({
          success: false,
          error: 'Invalid or missing status'
        });
      }
  
      // Extract actual collect_id from order_id (assumed format: "collect_id/transaction_id")
      const [collectId] = orderInfo.order_id.split('/');
  
      const order = await Order.findOne({ custom_order_id: collectId });
  
      if (!order) {
        webhookLog.status_code = 404;
        await webhookLog.save();
        return res.status(200).json({
          success: false,
          error: 'Order not found'
        });
      }
  
      // Update or create OrderStatus
      const existingStatus = await OrderStatus.findOne({ collect_id: order._id });
  
      const statusData = {
        collect_id: order._id,
        order_amount: orderInfo.order_amount,
        transaction_amount: orderInfo.transaction_amount,
        payment_mode: orderInfo.payment_mode || 'unknown',
        payment_details: orderInfo.payemnt_details || '',
        bank_reference: orderInfo.bank_reference || '',
        status,
        payment_message: orderInfo.Payment_message || '',
        error_message: status === 'failed' ? (orderInfo.error_message || 'Payment failed') : '',
        payment_time: new Date(orderInfo.payment_time)
      };
  
      if (existingStatus) {
        await OrderStatus.findByIdAndUpdate(existingStatus._id, statusData, { new: true });
      } else {
        await new OrderStatus(statusData).save();
      }
  
      webhookLog.processed = true;
      await webhookLog.save();
  
      return res.status(200).json({
        success: true,
        message: 'Payment status updated'
      });
    } catch (error) {
      console.error('❌ Webhook error:', error.message);
  
      if (webhookLog) {
        webhookLog.status_code = 500;
        webhookLog.processed = false;
        await webhookLog.save();
      }
  
      return res.status(200).json({
        success: false,
        error: 'Webhook processing failed',
        message: error.message
      });
    }
  });

// @desc    Check payment status
// @route   GET /api/payments/status/:collect_request_id
// @access  Private/Admin/Trustee
router.get("/status/:collect_request_id", protect, authorize('admin', 'trustee'), async (req, res) => {
  try {
    const { collect_request_id } = req.params;
    const { school_id } = req.query;

    if (!collect_request_id || !school_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters: collect_request_id or school_id"
      });
    }

    const PG_KEY = process.env.PG_KEY;
    const API_KEY = process.env.API_KEY;

    // Generate JWT signature for status check
    const payload = {
      school_id,
      collect_request_id
    };
    
    const sign = jwt.sign(payload, PG_KEY, { algorithm: "HS256" });

    // Make API call to check status
    const response = await axios.get(
      `https://dev-vanilla.edviron.com/erp/collect-request/${collect_request_id}?school_id=${school_id}&sign=${sign}`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`
        }
      }
    );

    // Check if payment is successful and not already recorded
    const order = await Order.findOne({ custom_order_id: collect_request_id });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found for this payment"
      });
    }
    
    const existingStatus = await OrderStatus.findOne({ collect_id: order._id });
    
    if (response.data.status === "SUCCESS" && !existingStatus) {
      // Create payment status record
      const orderStatus = new OrderStatus({
        collect_id: order._id,
        order_amount: Number(response.data.amount),
        transaction_amount: Number(response.data.amount),
        payment_mode: response.data.details?.payment_methods || "UPI",
        payment_details: JSON.stringify(response.data.details || {}),
        status: "success",
        payment_message: "payment success",
        payment_time: new Date()
      });
 
      await orderStatus.save();
    }

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Payment status check error:', error);
    res.status(500).json({
      success: false,
      error: "Payment status check failed",
      message: error.message
    });
  }
});

// @desc    Get all orders
// @route   GET /api/payments/orders
// @access  Private/Admin/Trustee
router.get("/orders", protect, authorize('admin', 'trustee'), async (req, res, next) => {
  try {
    const { school_id } = req.query;
    
    const query = school_id ? { school_id } : {};
    
    // If user is a trustee, only show their orders
    if (req.user.role === 'trustee') {
      query.trustee_id = req.user.id;
    }
    
    const orders = await Order.find(query)
      .populate('school_id', 'name contact_email')
      .populate('trustee_id', 'name email');

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Get payment statuses
// @route   GET /api/payments/statuses
// @access  Private/Admin/Trustee
router.get("/statuses", protect, authorize('admin', 'trustee'), async (req, res, next) => {
  try {
    const { status, collect_id } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (collect_id) query.collect_id = collect_id;
    
    const statuses = await OrderStatus.find(query)
      .populate({
        path: 'collect_id',
        populate: {
          path: 'school_id trustee_id',
          select: 'name email contact_email'
        }
      });

    res.status(200).json({
      success: true,
      count: statuses.length,
      data: statuses
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Test webhook simulation
// @route   GET /api/payments/test-webhook/:collect_request_id
// @access  Public
router.get("/test-webhook/:collect_request_id", async (req, res) => {
  try {
    const { collect_request_id } = req.params;
    const { status = 'SUCCESS', amount = '2000' } = req.query;
    
    // Find the corresponding order
    const order = await Order.findOne({ custom_order_id: collect_request_id });
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        error: "Order not found",
        message: "No order found with this collect_request_id"
      });
    }
    
    console.log(`🔍 Found order: ${order._id} for testing`);
    
    // Get server URL from environment or construct a default
    const serverUrl = process.env.CALLBACK_URL || 
                     `http://localhost:${process.env.PORT || 3000}/api/payments/webhook`;
    
    const serverBaseUrl = serverUrl.substring(0, serverUrl.lastIndexOf('/'));
    
    // Create test webhook payload
    const webhookPayload = {
      collect_request_id,
      EdvironCollectRequestId: collect_request_id, // Add alternate field name
      status,
      amount,
      payment_details: {
        payment_method: "UPI",
        transaction_id: `test-txn-${Date.now()}`
      }
    };
    
    console.log(`⚡ Simulating webhook call to ${serverUrl}`);
    console.log('⚡ Payload:', webhookPayload);
    
    // Try to make internal request to webhook endpoint
    try {
      // First try as POST request (as it should be)
      const webhookResponse = await axios.post(
        serverUrl,
        webhookPayload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ POST webhook call successful');
      
      return res.status(200).json({
        success: true,
        message: "Webhook test executed successfully",
        original_order: order,
        webhook_payload: webhookPayload,
        webhook_response: webhookResponse.data,
        note: "Your webhook endpoint is working correctly!"
      });
    } catch (postError) {
      console.error('❌ POST webhook call failed:', postError.message);
      
      // Try alternate approach - calling with query parameters
      try {
        // Build query string
        const queryParams = new URLSearchParams({
          collect_request_id,
          EdvironCollectRequestId: collect_request_id,
          status,
          amount
        }).toString();
        
        const getUrl = `${serverBaseUrl}/api/payments/webhook?${queryParams}`;
        console.log(`⚡ Trying GET request to: ${getUrl}`);
        
        const getResponse = await axios.get(getUrl);
        
        console.log('✅ GET webhook call successful');
        
        return res.status(200).json({
          success: true,
          message: "Webhook test executed as GET request (not ideal but working)",
          original_order: order,
          webhook_payload: webhookPayload,
          webhook_response: getResponse.data,
          note: "Your webhook is handling GET requests, but it would be better to handle POST requests."
        });
      } catch (getError) {
        throw new Error(`Both POST and GET webhook tests failed. POST error: ${postError.message}, GET error: ${getError.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Webhook test error:', error);
    return res.status(500).json({
      success: false,
      error: "Webhook test failed",
      message: error.message,
      tip: "Make sure your server is running and accessible via the tunnel"
    });
  }
});

module.exports = router; 