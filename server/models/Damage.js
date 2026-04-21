const mongoose = require('mongoose');

const damageSchema = new mongoose.Schema({
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
  remark: {
    type: String,
    trim: true,
    default: ''
  },
  deleted_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  product_snapshot: {
    sku: { type: String, trim: true },
    name: { type: String, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    price: { type: Number, min: 0 },
    cost: { type: Number, min: 0 },
    supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    barcode: { type: String, trim: true }
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Damage', damageSchema);

