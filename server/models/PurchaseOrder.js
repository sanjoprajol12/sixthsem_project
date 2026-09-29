const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
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
  received_quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  unit_price: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  tax_rate: {
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

const purchaseOrderSchema = new mongoose.Schema({
  order_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  supplier_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
    index: true
  },
  status: {
    type: String,
    required: true,
    default: 'draft',
    enum: [
      'draft',
      'submitted',
      'approved',
      'ordered',
      'partially_received',
      'received',
      'closed',
      'cancelled',
      // Legacy support
      'pending',
      'processing'
    ],
    index: true
  },
  payment_status: {
    type: String,
    enum: ['unpaid', 'partially_paid', 'paid'],
    default: 'unpaid'
  },
  payment_terms: {
    type: String,
    default: 'Net 30'
  },
  subtotal: {
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
  paid_amount: {
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
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approved_at: {
    type: Date
  },
  expected_delivery_date: {
    type: Date
  },
  received_at: {
    type: Date
  },
  notes: {
    type: String,
    default: ''
  },
  items: [purchaseOrderItemSchema],
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

purchaseOrderSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
