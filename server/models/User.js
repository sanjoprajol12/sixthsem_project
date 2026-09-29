const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  full_name: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  role: {
    type: String,
    required: true,
    default: 'sales_staff',
    enum: [
      'super_admin',
      'admin',
      'inventory_manager',
      'sales_staff',
      'purchase_staff',
      'staff' // legacy compatibility
    ],
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'active', 'disabled'],
    default: 'active',
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  }
});

userSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);
