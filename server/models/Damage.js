const mongoose = require('mongoose');

const damageSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  damage_type: {
    type: String,
    enum: [
      'Broken / Transit Damage',
      'Expired Shelf Life',
      'Defective / Manufacturing Fault',
      'Water / Moisture Damage',
      'Infestation / Contamination',
      'Other'
    ],
    default: 'Broken / Transit Damage'
  },
  remark: {
    type: String,
    trim: true,
    default: ''
  },
  unit_cost: {
    type: Number,
    default: 0
  },
  total_loss: {
    type: Number,
    default: 0
  },
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  },
  recorded_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Keep deleted_by for backwards compatibility
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
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('Damage', damageSchema);
