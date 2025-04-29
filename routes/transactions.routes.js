const express = require('express');
const router = express.Router();
const OrderStatus = require('../models/order-status.model');
const Order = require('../models/order.model');
const { protect, authorize } = require('../middlewares/auth.middleware');

/**
 * @desc    Fetch All Transactions
 * @route   GET /api/transactions
 * @access  Private/Admin/Trustee
 */
router.get('/', protect, authorize('admin', 'trustee'), async (req, res) => {
  try {
    const { status } = req.query;
    
    // Create match stage for status filtering
    const matchStage = {};
    if (status && ['success', 'pending', 'failed'].includes(status.toLowerCase())) {
      matchStage.status = status.toLowerCase();
    }

    // If user is trustee, only show their transactions
    if (req.user.role === 'trustee') {
      matchStage['order.trustee_id'] = req.user.id;
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
      },
      // Sort by payment time descending (most recent first)
      {
        $sort: {
          payment_time: -1
        }
      }
    ]);

    // If no transactions found, return empty array
    if (!transactions.length) {
      return res.status(200).json([]);
    }

    res.status(200).json(transactions);
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
    
    // Ensure all statuses are represented
    const statuses = ['success', 'pending', 'failed'];
    const formattedSummary = statuses.map(status => {
      const statusData = summary.find(s => s.status === status) || { 
        status, 
        count: 0, 
        totalAmount: 0 
      };
      
      return {
        ...statusData,
        percentage: totalCount ? ((statusData.count / totalCount) * 100).toFixed(2) : 0
      };
    });
    
    res.status(200).json({
      summary: formattedSummary,
      totals: {
        totalTransactions: totalCount,
        totalAmount,
        successRate: totalCount ? 
          ((formattedSummary.find(s => s.status === 'success')?.count || 0) / totalCount * 100).toFixed(2) : 0
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
    const { status, page = 1, limit = 10 } = req.query;
    
    // Create match stage for filtering
    const matchStage = {
      'order.school_id': schoolId
    };

    // Add status filter if provided
    if (status && ['success', 'pending', 'failed'].includes(status.toLowerCase())) {
      matchStage.status = status.toLowerCase();
    }

    // If user is trustee, verify they have access to this school
    if (req.user.role === 'trustee') {
      const hasAccess = await Order.exists({
        school_id: schoolId,
        trustee_id: req.user.id
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view transactions for this school'
        });
      }
    }

    // Calculate skip value for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await OrderStatus.aggregate([
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
      {
        $project: {
          collect_id: 1,
          order_amount: 1,
          transaction_amount: 1,
          status: 1,
          payment_mode: 1,
          payment_time: 1,
          bank_reference: { $ifNull: ['$bank_reference', 'N/A'] },
          custom_order_id: '$order.custom_order_id',
          student_info: '$order.student_info'
        }
      },
      { $sort: { payment_time: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    // Get total count for pagination
    const totalCount = await OrderStatus.aggregate([
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
      { $count: 'total' }
    ]);

    res.status(200).json({
      transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil((totalCount[0]?.total || 0) / parseInt(limit)),
        totalRecords: totalCount[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching school transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch school transactions',
      message: error.message
    });
  }
});

/**
 * @desc    Check Transaction Status by Custom Order ID
 * @route   GET /api/transactions/status/:custom_order_id
 * @access  Private/Admin/Trustee
 */
router.get('/status/:custom_order_id', protect, authorize('admin', 'trustee'), async (req, res) => {
  try {
    const { custom_order_id } = req.params;

    // First find the order
    const order = await Order.findOne({ custom_order_id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check authorization for trustee
    if (req.user.role === 'trustee' && order.trustee_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this transaction'
      });
    }

    // Find the transaction status
    const transaction = await OrderStatus.findOne({
      collect_id: order._id
    }).select('status payment_time payment_mode transaction_amount payment_message error_message bank_reference');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'No transaction found for this order'
      });
    }

    res.status(200).json({
      success: true,
      transaction: {
        custom_order_id,
        status: transaction.status,
        payment_time: transaction.payment_time,
        payment_mode: transaction.payment_mode,
        transaction_amount: transaction.transaction_amount,
        payment_message: transaction.payment_message,
        error_message: transaction.error_message,
        bank_reference: transaction.bank_reference || 'N/A'
      }
    });
  } catch (error) {
    console.error('❌ Error checking transaction status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check transaction status',
      message: error.message
    });
  }
});

module.exports = router; 