const mongoose = require('mongoose');

const salesOrderItemSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit_price: {
    type: Number,
    required: true,
    min: 0
  },
  total_price: {
    type: Number,
    required: true,
    min: 0
  }
});

const salesOrderSchema = new mongoose.Schema({
  order_number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  customer_name: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    required: true,
    default: 'pending',
    enum: ['pending', 'processing', 'shipped', 'completed', 'cancelled']
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [salesOrderItemSchema],
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

salesOrderSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('SalesOrder', salesOrderSchema);

