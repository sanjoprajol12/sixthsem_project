const { Notification, Product } = require('../models');

class NotificationService {
  /**
   * Create a notification
   */
  static async notify({ title, message, type = 'general', severity = 'info', targetRole = 'all', referenceType, referenceId }) {
    try {
      return await Notification.create({
        title,
        message,
        type,
        severity,
        target_role: targetRole,
        reference_type: referenceType,
        reference_id: referenceId
      });
    } catch (err) {
      console.error('NotificationService error:', err.message);
      return null;
    }
  }

  /**
   * Evaluate product stock and notify if low or out of stock
   */
  static async checkStockThresholds(productId) {
    try {
      const product = await Product.findById(productId);
      if (!product) return;

      const qty = product.quantity;
      const reorder = product.reorder_level || 10;
      const min = product.minimum_stock || 5;

      if (qty <= 0) {
        // Check if an unread notification already exists
        const exists = await Notification.findOne({
          reference_id: product._id,
          type: 'out_of_stock',
          is_read: false
        });
        if (!exists) {
          await this.notify({
            title: `Out of Stock: ${product.name}`,
            message: `Product SKU [${product.sku}] is completely out of stock (0 units). Reorder immediately.`,
            type: 'out_of_stock',
            severity: 'critical',
            targetRole: 'all',
            referenceType: 'Product',
            referenceId: product._id
          });
        }
      } else if (qty <= min) {
        const exists = await Notification.findOne({
          reference_id: product._id,
          type: 'critical_stock',
          is_read: false
        });
        if (!exists) {
          await this.notify({
            title: `Critical Stock Level: ${product.name}`,
            message: `Product SKU [${product.sku}] has only ${qty} units remaining (below minimum threshold of ${min}).`,
            type: 'critical_stock',
            severity: 'critical',
            targetRole: 'inventory_manager',
            referenceType: 'Product',
            referenceId: product._id
          });
        }
      } else if (qty <= reorder) {
        const exists = await Notification.findOne({
          reference_id: product._id,
          type: 'low_stock',
          is_read: false
        });
        if (!exists) {
          await this.notify({
            title: `Low Stock Alert: ${product.name}`,
            message: `Product SKU [${product.sku}] quantity (${qty}) is at or below reorder level (${reorder}). Suggested reorder recommended.`,
            type: 'low_stock',
            severity: 'warning',
            targetRole: 'all',
            referenceType: 'Product',
            referenceId: product._id
          });
        }
      }
    } catch (err) {
      console.error('checkStockThresholds error:', err.message);
    }
  }
}

module.exports = NotificationService;
