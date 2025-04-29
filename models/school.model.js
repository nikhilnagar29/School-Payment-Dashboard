const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SchoolSchema = new Schema({
  name: { 
    type: String, 
    required: true 
  },
  address: { 
    type: String 
  },
  contact_email: { 
    type: String, 
    required: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  trustees: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'Trustee' 
  }]
});

module.exports = mongoose.model('School', SchoolSchema); 