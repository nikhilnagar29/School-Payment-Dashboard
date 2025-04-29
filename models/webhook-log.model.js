const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WebhookLogSchema = new Schema({
  payload: { 
    type: Object, 
    required: true 
  }, // Raw webhook data
  status_code: { 
    type: Number, 
    required: true 
  }, // HTTP status code
  processed: { 
    type: Boolean, 
    default: false 
  }, // Flag if data was processed
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('WebhookLog', WebhookLogSchema); 