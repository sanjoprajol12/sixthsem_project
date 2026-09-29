const express = require('express');
const { Product, Supplier, Category, Customer, User, PurchaseOrder, SalesOrder, Damage } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/dashboard/counts
 * Centralized endpoint returning record counts for sidebar and summary widgets.
 * Response is tailored by user role and permissions.
 */
router.get('/counts', authenticateToken, async (req, res) => {
  try {
    const rawRole = (req.user?.role || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
    const isSuperAdmin = rawRole === 'super_admin' || rawRole === 'superadmin';
    const isAdmin = isSuperAdmin || rawRole === 'admin';
    const isInventoryManager = rawRole === 'inventory_manager';
    const isSalesStaff = rawRole === 'sales_staff';
    const isPurchaseStaff = rawRole === 'purchase_staff';

    const counts = {};

    // 1. Products
    // Everyone with access to inventory/products can see product counts
    if (isSuperAdmin) {
      const [total, approved, pending, disapproved] = await Promise.all([
        Product.countDocuments(),
        Product.countDocuments({ status: 'approved' }),
        Product.countDocuments({ status: 'pending' }),
        Product.countDocuments({ status: 'disapproved' })
      ]);
      counts.products = { total, approved, pending, disapproved };
    } else {
      // Non-super-admins only get total visible products (approved/active)
      const total = await Product.countDocuments({ status: { $in: ['approved', 'active'] } });
      counts.products = { total };
    }

    // 2. Suppliers
    if (isAdmin || isInventoryManager || isPurchaseStaff) {
      const [total, active, inactive] = await Promise.all([
        Supplier.countDocuments(),
        Supplier.countDocuments({ status: 'active' }),
        Supplier.countDocuments({ status: 'inactive' })
      ]);
      counts.suppliers = { total, active, inactive };
    }

    // 3. Categories
    if (isAdmin || isInventoryManager) {
      const [total, active, inactive] = await Promise.all([
        Category.countDocuments(),
        Category.countDocuments({ status: 'active' }),
        Category.countDocuments({ status: 'inactive' })
      ]);
      counts.categories = { total, active, inactive };
    }

    // 4. Customers
    if (isAdmin || isSalesStaff || isInventoryManager) {
      const [total, active, inactive] = await Promise.all([
        Customer.countDocuments(),
        Customer.countDocuments({ status: 'active' }),
        Customer.countDocuments({ status: 'inactive' })
      ]);
      counts.customers = { total, active, inactive };
    }

    // 5. Users
    if (isAdmin) {
      const [total, active, disabled, pending] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ status: 'active' }),
        User.countDocuments({ status: 'disabled' }),
        User.countDocuments({ status: 'pending' })
      ]);
      counts.users = { total, active, disabled, pending };
    }

    // 6. Purchase Orders
    if (isAdmin || isInventoryManager || isPurchaseStaff) {
      const [total, pending] = await Promise.all([
        PurchaseOrder.countDocuments(),
        PurchaseOrder.countDocuments({ status: 'pending' })
      ]);
      counts.purchaseOrders = { total, pending };
    }

    // 7. Sales Orders
    if (isAdmin || isSalesStaff || isInventoryManager) {
      const total = await SalesOrder.countDocuments();
      counts.salesOrders = { total };
    }

    // 8. Damages
    if (isAdmin || isInventoryManager) {
      const total = await Damage.countDocuments();
      counts.damages = { total };
    }

    res.json(counts);
  } catch (error) {
    console.error('Error fetching dashboard counts:', error);
    res.status(500).json({ error: 'Failed to retrieve sidebar counts' });
  }
});

module.exports = router;
