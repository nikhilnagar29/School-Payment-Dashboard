const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrderStatusSchema = new Schema({
  collect_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Order', 
    required: true 
  },
  order_amount: { 
    type: Number, 
    required: true 
  }, // Original amount
  transaction_amount: { 
    type: Number, 
    required: true 
  }, // Final paid amount
  payment_mode: { 
    type: String, 
    required: true 
  }, // e.g., "UPI"
  payment_details: { 
    type: String 
  }, // e.g., "success@ybl"
  bank_reference: { 
    type: String 
  }, // Bank transaction ID
  status: { 
    type: String, 
    enum: ['success', 'pending', 'failed'], 
    required: true 
  },
  payment_message: { 
    type: String 
  }, // e.g., "payment success"
  error_message: { 
    type: String 
  }, // Error details if failed
  payment_time: { 
    type: Date, 
    required: true 
  }
});

// Add indexes to improve query performance
OrderStatusSchema.index({ collect_id: 1 });
OrderStatusSchema.index({ status: 1 });
OrderStatusSchema.index({ payment_time: -1 }); // For sorting by most recent

module.exports = mongoose.model('OrderStatus', OrderStatusSchema); 