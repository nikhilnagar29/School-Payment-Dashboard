const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TrusteeSchema = new Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  schools: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'School' 
  }]
});

module.exports = mongoose.model('Trustee', TrusteeSchema); 