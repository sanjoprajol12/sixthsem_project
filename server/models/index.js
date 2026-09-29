// Export all models for unified importing across the application
module.exports = {
  User: require('./User'),
  Supplier: require('./Supplier'),
  Customer: require('./Customer'),
  Location: require('./Location'),
  Product: require('./Product'),
  Damage: require('./Damage'),
  PurchaseOrder: require('./PurchaseOrder'),
  SalesOrder: require('./SalesOrder'),
  InventoryTransaction: require('./InventoryTransaction'),
  StockAdjustment: require('./StockAdjustment'),
  SalesHistory: require('./SalesHistory'),
  Category: require('./Category'),
  AuditLog: require('./AuditLog'),
  Notification: require('./Notification')
};
