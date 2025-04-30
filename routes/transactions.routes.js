const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const OrderStatus = require('../models/order-status.model');
const Order = require('../models/order.model');
const { protect, authorize } = require('../middlewares/auth.middleware');

/**
 * @desc    Fetch All Transactions with pagination
 * @route   GET /api/transactions?page=1&limit=10&status=all|success|pending|failed
 * @access  Private/Admin/Trustee
 */
router.get('/', protect, authorize('admin','trustee'), async (req, res) => {
  try {
    const { status, page = '1', limit = '10' } = req.query;
    const pageNum  = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (pageNum<1||limitNum<1) return res.status(400).json({ success:false, error:'Page & limit must be ≥1' });

    // build match
    const matchStage = {};
    if (status && status.toLowerCase() !== 'all' && ['success','pending','failed'].includes(status.toLowerCase())) {
      matchStage.status = status.toLowerCase();
    }
    if (req.user.role==='trustee') {
      matchStage['order.trustee_id'] = mongoose.Types.ObjectId(req.user.id);
    }

    // Calculate skip value (zero-indexed)
    // For page 1, skip 0 items; for page 2, skip 'limit' items, etc.
    const skip = (pageNum-1)*limitNum;
    
    const pipeline = [
      { $lookup: {
          from: 'orders',
          localField: 'collect_id',
          foreignField: '_id',
          as: 'order'
      }},
      { $unwind: '$order' },
      { $match: matchStage },
      { $sort: { payment_time: -1 } },
      { $skip: skip },
      { $limit: limitNum },
      { $project: {
          collect_id: 1,
          school_id: '$order.school_id',
          gateway: '$order.gateway_name',
          order_amount: 1,
          transaction_amount: 1,
          status: 1,
          custom_order_id: '$order.custom_order_id',
          payment_mode: 1,
          payment_time: 1,
          bank_reference: { $ifNull: ['$bank_reference', 'N/A'] }
      }}
    ];

    const [data, countResult] = await Promise.all([
      OrderStatus.aggregate(pipeline),
      OrderStatus.aggregate([
        ...pipeline.slice(0,3),    // lookup, unwind, match
        { $count: 'totalCount' }
      ])
    ]);

    const total = countResult[0]?.totalCount||0;
    
    // Calculate human-readable record range
    const startRecord = total > 0 ? skip + 1 : 0;
    const endRecord = Math.min(skip + limitNum, total);
    
    return res.json({
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total/limitNum),
        // Include human-readable record numbers
        showing: `${startRecord} to ${endRecord} of ${total} records`
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success:false, error:'Server error' });
  }
});


/**
 * @desc    Testing route - Fetch Transactions with no auth (for development only)
 * @route   GET /api/transactions/test?page=1&limit=10&status=all|success|pending|failed
 * @access  Public (Development Only)
 */
router.get('/test', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    // Convert page and limit to integers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    
    // Validate page and limit
    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Page and limit must be positive integers'
      });
    }
    
    // Calculate skip value (zero-indexed)
    // For page 1, skip 0 items; for page 2, skip 'limit' items, etc.
    const skip = (pageNum-1)*limitNum;
    
    // Create match stage for status filtering - handle 'all' status
    const matchStage = {};
    if (status && status.toLowerCase() !== 'all' && ['success', 'pending', 'failed'].includes(status.toLowerCase())) {
      matchStage.status = status.toLowerCase();
    }

    // Use aggregation pipeline to join collections and format data
    const transactions = await OrderStatus.aggregate([
      // Join with orders collection
      {
        $lookup: {
          from: 'orders', // The collection to join with
          localField: 'collect_id',
          foreignField: '_id',
          as: 'order'
        }
      },
      // Unwind the order array (since lookup returns an array)
      {
        $unwind: '$order'
      },
      // Match stage for filtering
      {
        $match: matchStage
      },
      // Sort by payment time descending (most recent first) - must sort before pagination
      {
        $sort: {
          payment_time: -1
        }
      },
      // Apply pagination
      {
        $skip: skip
      },
      {
        $limit: limitNum
      },
      // Project only the required fields
      {
        $project: {
          collect_id: '$collect_id',
          school_id: '$order.school_id',
          gateway: '$order.gateway_name',
          order_amount: '$order_amount',
          transaction_amount: '$transaction_amount',
          status: '$status',
          custom_order_id: '$order.custom_order_id',
          payment_mode: '$payment_mode',
          payment_time: '$payment_time',
          bank_reference: { $ifNull: ['$bank_reference', 'N/A'] }
        }
      }
    ]);

    // Count total documents for pagination info
    const countPipeline = [
      // Join with orders collection
      {
        $lookup: {
          from: 'orders',
          localField: 'collect_id',
          foreignField: '_id',
          as: 'order'
        }
      },
      // Unwind the order array
      {
        $unwind: '$order'
      },
      // Match stage for filtering
      {
        $match: matchStage
      },
      // Count documents
      {
        $count: 'totalCount'
      }
    ];

    const countResult = await OrderStatus.aggregate(countPipeline);
    
    const totalCount = countResult.length > 0 ? countResult[0].totalCount : 0;
    const totalPages = Math.ceil(totalCount / limitNum);

    // Calculate human-readable record range
    const startRecord = totalCount > 0 ? skip + 1 : 0;
    const endRecord = Math.min(skip + limitNum, totalCount);

    // If no transactions found, return empty array with pagination info
    if (!transactions.length) {
      return res.status(200).json({
        data: [],
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          pages: totalPages,
          showing: `0 to 0 of ${totalCount} records`
        }
      });
    }

    res.status(200).json({
      data: transactions,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: totalPages,
        showing: `${startRecord} to ${endRecord} of ${totalCount} records`
      }
    });
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
      message: error.message
    });
  }
});

/**
 * @desc    Get Transaction Summary Statistics
 * @route   GET /api/transactions/summary
 * @access  Private/Admin/Trustee
 */
router.get('/summary', protect, authorize('admin', 'trustee'), async (req, res) => {
  try {
    let matchQuery = {};
    
    // If user is trustee, only include their transactions in summary
    if (req.user.role === 'trustee') {
      const trusteeOrders = await Order.find({ trustee_id: req.user.id }).select('_id');
      const orderIds = trusteeOrders.map(order => order._id);
      matchQuery.collect_id = { $in: orderIds };
    }
    
    // Get aggregate summary by status
    const summary = await OrderStatus.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$transaction_amount' }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          totalAmount: 1,
          _id: 0
        }
      }
    ]);
    
    // Calculate overall totals
    const totalCount = summary.reduce((acc, curr) => acc + curr.count, 0);
    const totalAmount = summary.reduce((acc, curr) => acc + curr.totalAmount, 0);
    
    // Create a cleaner, simplified response format
    const successData = summary.find(s => s.status === 'success') || { count: 0, totalAmount: 0 };
    const pendingData = summary.find(s => s.status === 'pending') || { count: 0, totalAmount: 0 };
    const failedData = summary.find(s => s.status === 'failed') || { count: 0, totalAmount: 0 };
    
    res.status(200).json({
      stats: {
        success: {
          count: successData.count,
          amount: successData.totalAmount
        },
        pending: {
          count: pendingData.count,
          amount: pendingData.totalAmount
        },
        failed: {
          count: failedData.count,
          amount: failedData.totalAmount
        }
      },
      totals: {
        transactions: totalCount,
        amount: totalAmount
      }
    });
  } catch (error) {
    console.error('❌ Error generating transaction summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate transaction summary',
      message: error.message
    });
  }
});

/**
 * @desc    Get Transaction Summary Statistics (Test Version)
 * @route   GET /api/transactions/test/summary
 * @access  Public (Development Only)
 */
router.get('/test/summary', async (req, res) => {
  try {
    // Get aggregate summary by status
    const summary = await OrderStatus.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$transaction_amount' }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          totalAmount: 1,
          _id: 0
        }
      }
    ]);
    
    // Calculate overall totals
    const totalCount = summary.reduce((acc, curr) => acc + curr.count, 0);
    const totalAmount = summary.reduce((acc, curr) => acc + curr.totalAmount, 0);
    
    // Create a cleaner, simplified response format
    const successData = summary.find(s => s.status === 'success') || { count: 0, totalAmount: 0 };
    const pendingData = summary.find(s => s.status === 'pending') || { count: 0, totalAmount: 0 };
    const failedData = summary.find(s => s.status === 'failed') || { count: 0, totalAmount: 0 };
    
    res.status(200).json({
      stats: {
        success: {
          count: successData.count,
          amount: successData.totalAmount
        },
        pending: {
          count: pendingData.count,
          amount: pendingData.totalAmount
        },
        failed: {
          count: failedData.count,
          amount: failedData.totalAmount
        }
      },
      totals: {
        transactions: totalCount,
        amount: totalAmount
      }
    });
  } catch (error) {
    console.error('❌ Error generating transaction summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate transaction summary',
      message: error.message
    });
  }
});

/**
 * @desc    Get Transaction by ID
 * @route   GET /api/transactions/:id
 * @access  Private/Admin/Trustee
 */
router.get('/:id', protect, authorize('admin', 'trustee'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get transaction by ID without trying to populate school
    const transaction = await OrderStatus.findById(id)
      .populate({
        path: 'collect_id',
        select: 'school_id custom_order_id trustee_id gateway_name student_info payment_link'
      });
    
    // Check if transaction exists
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    // Check if user is authorized to view this transaction
    if (req.user.role === 'trustee' && 
        transaction.collect_id.trustee_id && 
        transaction.collect_id.trustee_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this transaction'
      });
    }
    
    // Format the response
    const formattedTransaction = {
      id: transaction._id,
      collect_id: transaction.collect_id._id,
      school_id: transaction.collect_id.school_id || 'N/A',
      gateway: transaction.collect_id.gateway_name || 'N/A',
      student_info: transaction.collect_id.student_info,
      order_amount: transaction.order_amount,
      transaction_amount: transaction.transaction_amount,
      status: transaction.status,
      custom_order_id: transaction.collect_id.custom_order_id,
      payment_mode: transaction.payment_mode,
      payment_time: transaction.payment_time,
      payment_details: transaction.payment_details,
      bank_reference: transaction.bank_reference || 'N/A',
      payment_message: transaction.payment_message,
      error_message: transaction.error_message,
      payment_link: transaction.collect_id.payment_link
    };
    
    res.status(200).json(formattedTransaction);
  } catch (error) {
    console.error('❌ Error fetching transaction details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction details',
      message: error.message
    });
  }
});

/**
 * @desc    Fetch Transactions by School ID
 * @route   GET /api/transactions/school/:schoolId
 * @access  Private/Admin/Trustee
 */
router.get('/school/:schoolId', protect, authorize('admin', 'trustee'), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { status, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    
    // Validate page and limit
    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'Page & limit must be positive integers' 
      });
    }

    // Validate schoolId
    if (!mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid school ID format'
      });
    }

    // Build match stage
    const matchStage = {
      'order.school_id': new mongoose.Types.ObjectId(schoolId)
    };
    
    // Add status filter if provided
    if (status && status.toLowerCase() !== 'all' && ['success', 'pending', 'failed'].includes(status.toLowerCase())) {
      matchStage.status = status.toLowerCase();
    }
    
    // If user is trustee, only show their transactions
    if (req.user.role === 'trustee') {
      matchStage['order.trustee_id'] = new mongoose.Types.ObjectId(req.user.id);
    }

    // Calculate skip value
    const skip = (pageNum - 1) * limitNum;
    
    // Create aggregation pipeline
    const pipeline = [
      { 
        $lookup: {
          from: 'orders',
          localField: 'collect_id',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: '$order' },
      { $match: matchStage },
      { $sort: { payment_time: -1 } },
      { $skip: skip },
      { $limit: limitNum },
      { 
        $project: {
          collect_id: 1,
          school_id: '$order.school_id',
          gateway: '$order.gateway_name',
          order_amount: 1,
          transaction_amount: 1,
          status: 1,
          custom_order_id: '$order.custom_order_id',
          payment_mode: 1,
          payment_time: 1,
          bank_reference: { $ifNull: ['$bank_reference', 'N/A'] },
          student_info: '$order.student_info'
        }
      }
    ];

    // Execute queries in parallel
    const [data, countResult] = await Promise.all([
      OrderStatus.aggregate(pipeline),
      OrderStatus.aggregate([
        ...pipeline.slice(0, 3), // lookup, unwind, match
        { $count: 'totalCount' }
      ])
    ]);

    const total = countResult[0]?.totalCount || 0;
    
    // Calculate human-readable record range
    const startRecord = total > 0 ? skip + 1 : 0;
    const endRecord = Math.min(skip + limitNum, total);

    return res.json({
      data,
      school_id: schoolId,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
        showing: `${startRecord} to ${endRecord} of ${total} records`
      }
    });
  } catch (error) {
    console.error('❌ Error fetching school transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
});

/**
 * @desc    Fetch Transactions by School ID (Test Route)
 * @route   GET /api/transactions/test/school/:schoolId
 * @access  Public (Development Only)
 */
router.get('/test/school/:schoolId', async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { status, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    
    // Validate page and limit
    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'Page & limit must be positive integers' 
      });
    }

    // Validate schoolId
    if (!mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid school ID format'
      });
    }

    // Build match stage
    const matchStage = {
      'order.school_id': new mongoose.Types.ObjectId(schoolId)
    };
    
    // Add status filter if provided
    if (status && status.toLowerCase() !== 'all' && ['success', 'pending', 'failed'].includes(status.toLowerCase())) {
      matchStage.status = status.toLowerCase();
    }

    // Calculate skip value
    const skip = (pageNum - 1) * limitNum;
    
    // Create aggregation pipeline
    const pipeline = [
      { 
        $lookup: {
          from: 'orders',
          localField: 'collect_id',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: '$order' },
      { $match: matchStage },
      { $sort: { payment_time: -1 } },
      { $skip: skip },
      { $limit: limitNum },
      { 
        $project: {
          collect_id: 1,
          school_id: '$order.school_id',
          gateway: '$order.gateway_name',
          order_amount: 1,
          transaction_amount: 1,
          status: 1,
          custom_order_id: '$order.custom_order_id',
          payment_mode: 1,
          payment_time: 1,
          bank_reference: { $ifNull: ['$bank_reference', 'N/A'] },
          student_info: '$order.student_info'
        }
      }
    ];

    // Execute queries in parallel
    const [data, countResult] = await Promise.all([
      OrderStatus.aggregate(pipeline),
      OrderStatus.aggregate([
        ...pipeline.slice(0, 3), // lookup, unwind, match
        { $count: 'totalCount' }
      ])
    ]);

    const total = countResult[0]?.totalCount || 0;
    
    // Calculate human-readable record range
    const startRecord = total > 0 ? skip + 1 : 0;
    const endRecord = Math.min(skip + limitNum, total);

    return res.json({
      data,
      school_id: schoolId,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
        showing: `${startRecord} to ${endRecord} of ${total} records`
      }
    });
  } catch (error) {
    console.error('❌ Error fetching school transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
});

module.exports = router; 