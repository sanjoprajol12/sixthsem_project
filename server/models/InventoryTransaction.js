const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  transaction_type: {
    type: String,
    required: true,
    enum: ['purchase', 'sale', 'adjustment']
  },
  quantity: {
    type: Number,
    required: true
  },
  unit_cost: {
    type: Number,
    required: true,
    min: 0
  },
  order_id: {
    type: mongoose.Schema.Types.ObjectId
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);

