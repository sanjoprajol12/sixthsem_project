const express = require('express');
const { Product, Supplier, PurchaseOrder, SalesHistory } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Automated Reordering Algorithm
router.post('/auto-reorder', authenticateToken, async (req, res) => {
  try {
    // Find products below reorder level
    const products = await Product.find({
      $expr: { $lte: ['$quantity', '$reorder_level'] }
    }).populate('supplier_id', 'name');

    if (products.length === 0) {
      return res.json({ message: 'No products need reordering', orders: [], skipped: [] });
    }

    // Separate products with and without suppliers
    const productsWithSuppliers = [];
    const skippedProducts = [];
    
    products.forEach(product => {
      if (product.supplier_id && product.supplier_id._id) {
        productsWithSuppliers.push(product);
      } else {
        skippedProducts.push({
          product_id: product._id,
          sku: product.sku,
          name: product.name,
          quantity: product.quantity,
          reorder_level: product.reorder_level,
          reason: 'No supplier assigned'
        });
      }
    });

    // Group products by supplier
    const supplierGroups = {};
    productsWithSuppliers.forEach(product => {
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

    // Build response message
    let message = '';
    if (createdOrders.length > 0 && skippedProducts.length > 0) {
      message = `Created ${createdOrders.length} automatic purchase order(s). ${skippedProducts.length} product(s) skipped due to missing suppliers.`;
    } else if (createdOrders.length > 0) {
      message = `Created ${createdOrders.length} automatic purchase order(s)`;
    } else if (skippedProducts.length > 0) {
      message = `No purchase orders created. ${skippedProducts.length} product(s) need suppliers assigned.`;
    } else {
      message = 'No products need reordering';
    }

    res.json({
      message,
      orders: createdOrders,
      skipped: skippedProducts
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

// Inventory Optimization Algorithm
// Analyses products and historical sales to suggest better reorder levels
// and highlights overstocked / understocked items.
router.get('/inventory-optimization', authenticateToken, async (req, res) => {
  try {
    const { days = 60 } = req.query;
    const analysisWindowDays = Math.max(parseInt(days, 10) || 60, 7);

    const windowStartDate = new Date();
    windowStartDate.setDate(windowStartDate.getDate() - analysisWindowDays);

    // Fetch products and their sales in parallel
    const [products, salesHistory] = await Promise.all([
      Product.find({}),
      SalesHistory.aggregate([
        {
          $match: {
            sale_date: { $gte: windowStartDate }
          }
        },
        {
          $group: {
            _id: '$product_id',
            totalQuantity: { $sum: '$quantity' },
            firstSaleDate: { $min: '$sale_date' },
            lastSaleDate: { $max: '$sale_date' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const salesByProduct = new Map();
    salesHistory.forEach((entry) => {
      salesByProduct.set(entry._id.toString(), entry);
    });

    const results = [];
    let slowMoving = 0;
    let overstocked = 0;
    let understocked = 0;

    products.forEach((product) => {
      const salesEntry = salesByProduct.get(product._id.toString());
      const currentQty = product.quantity || 0;
      const reorderLevel = product.reorder_level || 0;

      let totalSold = 0;
      let avgDailySales = 0;
      let demandClassification = 'no_data';

      if (salesEntry) {
        totalSold = salesEntry.totalQuantity || 0;

        const activeDays = Math.max(
          1,
          Math.ceil(
            (salesEntry.lastSaleDate.getTime() - salesEntry.firstSaleDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );

        avgDailySales = totalSold / activeDays;

        if (avgDailySales === 0) {
          demandClassification = 'no_demand';
        } else if (avgDailySales < 0.5) {
          demandClassification = 'slow_moving';
        } else if (avgDailySales < 2) {
          demandClassification = 'normal';
        } else {
          demandClassification = 'fast_moving';
        }
      }

      // Simple suggested reorder level based on moving demand
      const safetyFactor =
        demandClassification === 'fast_moving' ? 7 : demandClassification === 'normal' ? 5 : 3;

      const suggestedReorderLevel = Math.max(
        5,
        Math.round(avgDailySales * safetyFactor) || reorderLevel || 5
      );

      // Days of cover = how many days current stock can sustain recent demand
      const daysOfCover = avgDailySales > 0 ? currentQty / avgDailySales : null;

      let stockClassification = 'balanced';
      if (avgDailySales > 0) {
        if (daysOfCover !== null && daysOfCover < 3) {
          stockClassification = 'understocked';
          understocked += 1;
        } else if (daysOfCover !== null && daysOfCover > 60) {
          stockClassification = 'overstocked';
          overstocked += 1;
        }
      }

      if (demandClassification === 'slow_moving' || demandClassification === 'no_demand') {
        slowMoving += 1;
      }

      results.push({
        product_id: product._id,
        sku: product.sku,
        name: product.name,
        current_stock: currentQty,
        reorder_level: reorderLevel,
        suggested_reorder_level: suggestedReorderLevel,
        avg_daily_sales: Number.isFinite(avgDailySales)
          ? Number(avgDailySales.toFixed(2))
          : 0,
        days_of_cover: daysOfCover !== null && Number.isFinite(daysOfCover)
          ? Number(daysOfCover.toFixed(1))
          : null,
        demand_classification: demandClassification,
        stock_classification: stockClassification
      });
    });

    res.json({
      window_days: analysisWindowDays,
      summary: {
        products_analyzed: products.length,
        slow_moving_products: slowMoving,
        overstocked_products: overstocked,
        understocked_products: understocked
      },
      recommendations: results
    });
  } catch (error) {
    console.error('Inventory optimization error:', error);
    res.status(500).json({ error: 'Error analyzing inventory' });
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
