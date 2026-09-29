const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: [
      'low_stock',
      'out_of_stock',
      'critical_stock',
      'po_pending',
      'po_received',
      'sale_completed',
      'sale_cancelled',
      'damage_recorded',
      'adjustment_applied',
      'general'
    ],
    default: 'general'
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical', 'success'],
    default: 'info'
  },
  target_role: {
    type: String,
    default: 'all' // 'all', 'admin', 'inventory_manager', 'purchase_staff', 'sales_staff'
  },
  reference_type: {
    type: String
  },
  reference_id: {
    type: mongoose.Schema.Types.ObjectId
  },
  is_read: {
    type: Boolean,
    default: false,
    index: true
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
