const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrderSchema = new Schema({
  school_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'School', 
    required: true 
  },
  trustee_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Trustee', 
    required: true 
  },
  student_info: {
    names: { 
      type: String, 
      required: true 
    },
    id: { 
      type: String, 
      required: true 
    }, // Student ID
    email: { 
      type: String, 
      required: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email'
      ]
    }
  },
  gateway_name: { 
    type: String, 
    required: true 
  }, // e.g., "PhonePe"
  custom_order_id: { 
    type: String, 
    unique: true, 
    required: true 
  }, // Generated unique ID
  payment_link: {
    type: String,
    unique: true
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  }
});

// Add indexes to improve query performance
OrderSchema.index({ school_id: 1 });
OrderSchema.index({ trustee_id: 1 });
OrderSchema.index({ custom_order_id: 1 }, { unique: true });
OrderSchema.index({ created_at: -1 });

module.exports = mongoose.model('Order', OrderSchema); 