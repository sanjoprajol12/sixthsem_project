const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  transaction_type: {
    type: String,
    required: true,
    enum: [
      'PURCHASE_RECEIVE',
      'SALE_DEDUCT',
      'SALE_RETURN',
      'PURCHASE_RETURN',
      'DAMAGE',
      'LOSS',
      'ADJUSTMENT_IN',
      'ADJUSTMENT_OUT',
      'TRANSFER_IN',
      'TRANSFER_OUT',
      'INITIAL_COUNT',
      // Legacy support
      'purchase',
      'sale',
      'adjustment'
    ],
    index: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previous_quantity: {
    type: Number,
    required: true,
    default: 0
  },
  new_quantity: {
    type: Number,
    required: true,
    default: 0
  },
  unit_cost: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  reference_type: {
    type: String,
    enum: [
      'PurchaseOrder',
      'SalesOrder',
      'Damage',
      'StockAdjustment',
      'CustomerReturn',
      'SupplierReturn',
      'Transfer',
      'Manual'
    ],
    index: true
  },
  reference_id: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  reference_number: {
    type: String,
    trim: true,
    index: true
  },
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  },
  performed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  batch_number: {
    type: String,
    trim: true,
    default: ''
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
