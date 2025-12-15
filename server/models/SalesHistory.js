const mongoose = require('mongoose');

const salesHistorySchema = new mongoose.Schema({
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
  sale_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  unit_price: {
    type: Number,
    required: true,
    min: 0
  },
  sales_order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalesOrder'
  }
});

module.exports = mongoose.model('SalesHistory', salesHistorySchema);

