const express = require('express');
const router = express.Router();
const Payment = require('../models/payment.model');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { ErrorResponse } = require('../middlewares/error.middleware');

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private/Admin
router.get('/', protect, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const payments = await Payment.find().populate({
      path: 'student',
      select: 'name email'
    });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Get single payment
// @route   GET /api/payments/:id
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id).populate({
      path: 'student',
      select: 'name email'
    });

    if (!payment) {
      return next(new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is admin/staff or payment belongs to user
    if (req.user.role !== 'admin' && req.user.role !== 'staff' && 
        payment.student.toString() !== req.user.id) {
      return next(new ErrorResponse(`Not authorized to access this payment`, 403));
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Create new payment
// @route   POST /api/payments
// @access  Private/Admin
router.post('/', protect, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    // Add user to req.body
    req.body.createdBy = req.user.id;
    
    const payment = await Payment.create(req.body);

    res.status(201).json({
      success: true,
      data: payment
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Update payment
// @route   PUT /api/payments/:id
// @access  Private/Admin
router.put('/:id', protect, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    let payment = await Payment.findById(req.params.id);

    if (!payment) {
      return next(new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404));
    }

    // Set updatedAt
    req.body.updatedAt = Date.now();

    payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Delete payment
// @route   DELETE /api/payments/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return next(new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404));
    }

    await payment.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Get user payments
// @route   GET /api/payments/student/:studentId
// @access  Private
router.get('/student/:studentId', protect, async (req, res, next) => {
  try {
    // Make sure user is admin/staff or the student
    if (req.user.role !== 'admin' && req.user.role !== 'staff' && 
        req.params.studentId !== req.user.id) {
      return next(new ErrorResponse(`Not authorized to access these payments`, 403));
    }

    const payments = await Payment.find({ student: req.params.studentId });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router; 