const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  barcode: {
    type: String,
    trim: true,
    index: true,
    sparse: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  category: {
    type: String,
    trim: true,
    default: 'General',
    index: true
  },
  brand: {
    type: String,
    trim: true,
    default: ''
  },
  unit_of_measure: {
    type: String,
    trim: true,
    default: 'pcs' // pcs, kg, box, liter, pair, pack, meter
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  },
  reorder_level: {
    type: Number,
    required: true,
    default: 10,
    min: 0
  },
  minimum_stock: {
    type: Number,
    default: 5,
    min: 0
  },
  maximum_stock: {
    type: Number,
    default: 200,
    min: 0
  },
  cost: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  supplier_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued', 'archived'],
    default: 'active',
    index: true
  },
  batch_number: {
    type: String,
    trim: true,
    default: ''
  },
  expiry_date: {
    type: Date
  },
  lead_time_days: {
    type: Number,
    default: 7,
    min: 0
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

// Virtual for Stock Status (Calculated property based on inventory rules)
productSchema.virtual('stock_status').get(function () {
  const qty = this.quantity || 0;
  const reorder = this.reorder_level || 10;
  const min = this.minimum_stock || 5;
  const max = this.maximum_stock || 200;

  if (qty <= 0) return 'OUT_OF_STOCK';
  if (qty <= min) return 'CRITICAL';
  if (qty <= reorder) return 'LOW_STOCK';
  if (max > 0 && qty >= max) return 'OVERSTOCKED';
  return 'HEALTHY';
});

// Configure to include virtuals in JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

productSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Product', productSchema);
