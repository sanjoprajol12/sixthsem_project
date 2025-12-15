const express = require('express');
const { Product, Supplier, PurchaseOrder, SalesHistory } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Automated Reordering Algorithm
router.post('/auto-reorder', authenticateToken, async (req, res) => {
  try {
    // Find products below reorder level
    const products = await Product.find({
      $expr: { $lte: ['$quantity', '$reorder_level'] },
      supplier_id: { $ne: null }
    }).populate('supplier_id', 'name');

    if (products.length === 0) {
      return res.json({ message: 'No products need reordering', orders: [] });
    }

    // Group products by supplier
    const supplierGroups = {};
    products.forEach(product => {
      const supplierId = product.supplier_id._id.toString();
      if (!supplierGroups[supplierId]) {
        supplierGroups[supplierId] = {
          supplier_id: product.supplier_id._id,
          supplier_name: product.supplier_id.name,
          items: []
        };
      }
      // Calculate reorder quantity (reorder_level * 2 or minimum 20)
      const reorderQuantity = Math.max(product.reorder_level * 2, 20);
      supplierGroups[supplierId].items.push({
        product_id: product._id,
        quantity: reorderQuantity,
        unit_price: product.cost
      });
    });

    if (Object.keys(supplierGroups).length === 0) {
      return res.json({ message: 'No suppliers found for low stock items', orders: [] });
    }

    // Create purchase orders for each supplier
    const createdOrders = [];
    for (const supplierId of Object.keys(supplierGroups)) {
      const group = supplierGroups[supplierId];
      const totalAmount = group.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const orderNumber = `PO-AUTO-${Date.now()}-${supplierId}`;

      const orderItems = group.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price
      }));

      const purchaseOrder = await PurchaseOrder.create({
        order_number: orderNumber,
        supplier_id: group.supplier_id,
        total_amount: totalAmount,
        created_by: req.user.id,
        status: 'pending',
        items: orderItems
      });

      createdOrders.push({
        id: purchaseOrder._id,
        order_number: orderNumber,
        supplier_id: group.supplier_id,
        items: group.items
      });
    }

    res.json({
      message: `Created ${createdOrders.length} automatic purchase order(s)`,
      orders: createdOrders
    });
  } catch (error) {
    console.error('Auto reorder error:', error);
    res.status(500).json({ error: 'Error creating automatic purchase orders' });
  }
});

// Demand Forecasting Algorithm
router.get('/demand-forecast/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days) * 2);

    // Get historical sales data
    const salesData = await SalesHistory.find({
      product_id: productId,
      sale_date: { $gte: startDate }
    }).sort({ sale_date: 1 });

    if (salesData.length === 0) {
      return res.json({
        product_id: productId,
        forecast: {
          next_30_days: 0,
          next_60_days: 0,
          next_90_days: 0,
          method: 'insufficient_data'
        }
      });
    }

    // Calculate average daily sales
    const totalQuantity = salesData.reduce((sum, sale) => sum + sale.quantity, 0);
    const daysCount = salesData.length;
    const avgDailySales = totalQuantity / daysCount;

    // Simple moving average forecast
    const forecast30 = Math.ceil(avgDailySales * 30);
    const forecast60 = Math.ceil(avgDailySales * 60);
    const forecast90 = Math.ceil(avgDailySales * 90);

    // Get current stock
    const product = await Product.findById(productId).select('quantity reorder_level');
    const currentStock = product ? product.quantity : 0;
    const recommendedOrder = Math.max(0, forecast30 - currentStock);

    res.json({
      product_id: productId,
      historical_data: {
        total_sales: totalQuantity,
        days_analyzed: daysCount,
        average_daily_sales: avgDailySales.toFixed(2)
      },
      forecast: {
        next_30_days: forecast30,
        next_60_days: forecast60,
        next_90_days: forecast90,
        method: 'moving_average'
      },
      recommendation: {
        current_stock: currentStock,
        recommended_order_quantity: recommendedOrder,
        reorder_urgent: currentStock < forecast30
      }
    });
  } catch (error) {
    console.error('Demand forecast error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all algorithms summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const lowStockCount = await Product.countDocuments({
      $expr: { $lte: ['$quantity', '$reorder_level'] }
    });

    const pendingOrdersCount = await PurchaseOrder.countDocuments({
      order_number: { $regex: /^PO-AUTO-/ },
      status: 'pending'
    });

    res.json({
      auto_reorder: {
        products_needing_reorder: lowStockCount,
        pending_auto_orders: pendingOrdersCount
      },
      demand_forecast: {
        available_for: 'all_products_with_sales_history'
      }
    });
  } catch (error) {
    console.error('Algorithms summary error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
