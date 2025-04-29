const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const { ErrorResponse } = require('../middlewares/error.middleware');
const { protect } = require('../middlewares/auth.middleware');

// @desc    Register admin/trustee
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, role, school_id } = req.body;

    // Validate role
    if (!['admin', 'trustee'].includes(role)) {
      return next(new ErrorResponse('Role must be either admin or trustee', 400));
    }
 
    // Create user
    const user = await User.create({
      email,
      password,
      role,
      school_id
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return next(new ErrorResponse('Please provide an email and password', 400));
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
router.get('/logout', (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'User logged out successfully'
  });
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  res.status(statusCode).json({
    success: true,
    token
  });
};

module.exports = router; 