const express = require('express');
const { Product, Customer, Supplier, SalesOrder, PurchaseOrder } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Global unified search
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json({ products: [], customers: [], suppliers: [], salesOrders: [], purchaseOrders: [] });
    }

    const queryStr = q.trim();
    const regex = new RegExp(queryStr, 'i');

    const [products, customers, suppliers, salesOrders, purchaseOrders] = await Promise.all([
      Product.find({
        $or: [
          { name: regex },
          { sku: regex },
          { barcode: queryStr },
          { brand: regex },
          { category: regex }
        ]
      })
        .limit(8)
        .select('name sku barcode quantity price cost category status'),

      Customer.find({
        $or: [{ name: regex }, { phone: regex }, { email: regex }, { customer_code: regex }]
      })
        .limit(5)
        .select('name phone email customer_type customer_code'),

      Supplier.find({
        $or: [{ name: regex }, { contact_person: regex }, { phone: regex }, { email: regex }]
      })
        .limit(5)
        .select('name contact_person phone email'),

      SalesOrder.find({
        $or: [{ order_number: regex }, { invoice_number: regex }, { customer_name: regex }]
      })
        .limit(5)
        .select('order_number invoice_number customer_name total_amount status created_at'),

      PurchaseOrder.find({
        order_number: regex
      })
        .populate('supplier_id', 'name')
        .limit(5)
        .select('order_number supplier_id total_amount status created_at')
    ]);

    res.json({
      query: queryStr,
      results: {
        products,
        customers,
        suppliers,
        salesOrders,
        purchaseOrders
      }
    });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ error: 'Search error' });
  }
});

module.exports = router;
