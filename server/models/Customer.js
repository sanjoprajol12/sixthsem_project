const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  customer_code: {
    type: String,
    trim: true,
    uppercase: true,
    unique: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  customer_type: {
    type: String,
    enum: ['walk_in', 'retail', 'wholesale', 'corporate'],
    default: 'retail'
  },
  tax_number: {
    type: String,
    trim: true,
    default: ''
  },
  credit_limit: {
    type: Number,
    default: 0,
    min: 0
  },
  current_balance: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  notes: {
    type: String,
    default: ''
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

customerSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Customer', customerSchema);
