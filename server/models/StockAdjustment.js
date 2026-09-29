const mongoose = require('mongoose');

const adjustmentItemSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  system_quantity: {
    type: Number,
    required: true
  },
  physical_quantity: {
    type: Number,
    required: true,
    min: 0
  },
  difference: {
    type: Number,
    required: true // physical_quantity - system_quantity
  },
  unit_cost: {
    type: Number,
    required: true,
    default: 0
  },
  item_notes: {
    type: String,
    default: ''
  }
});

const stockAdjustmentSchema = new mongoose.Schema({
  adjustment_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'Cycle Count Reconciliation',
      'Physical Audit Discrepancy',
      'Found Unrecorded Stock',
      'Shrinkage / Unexplained Loss',
      'Spoilage / Quality Deterioration',
      'Data Correction',
      'Other'
    ]
  },
  status: {
    type: String,
    enum: ['applied', 'cancelled'],
    default: 'applied'
  },
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  },
  notes: {
    type: String,
    default: ''
  },
  performed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [adjustmentItemSchema],
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('StockAdjustment', stockAdjustmentSchema);
