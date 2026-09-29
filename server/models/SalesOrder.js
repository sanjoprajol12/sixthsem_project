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
  returned_quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  unit_price: {
    type: Number,
    required: true,
    min: 0
  },
  unit_cost: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
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
    trim: true,
    index: true
  },
  invoice_number: {
    type: String,
    trim: true,
    index: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  customer_name: {
    type: String,
    trim: true,
    default: 'Walk-in Customer'
  },
  customer_phone: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    required: true,
    default: 'completed',
    enum: [
      'draft',
      'confirmed',
      'paid',
      'completed',
      'cancelled',
      // Legacy support
      'pending',
      'processing',
      'shipped'
    ],
    index: true
  },
  stock_deducted: {
    type: Boolean,
    default: true
  },
  payment_method: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'credit', 'esewa', 'khalti', 'other'],
    default: 'cash'
  },
  payment_status: {
    type: String,
    enum: ['unpaid', 'partially_paid', 'paid', 'refunded'],
    default: 'paid'
  },
  subtotal: {
    type: Number,
    default: 0
  },
  discount_amount: {
    type: Number,
    default: 0
  },
  tax_amount: {
    type: Number,
    default: 0
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  total_cost: {
    type: Number,
    default: 0,
    min: 0
  },
  gross_profit: {
    type: Number,
    default: 0
  },
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  cancellation_reason: {
    type: String,
    default: ''
  },
  cancelled_at: {
    type: Date
  },
  items: [salesOrderItemSchema],
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

salesOrderSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('SalesOrder', salesOrderSchema);
