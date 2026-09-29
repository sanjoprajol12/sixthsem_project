const express = require('express');
const { Product, Supplier, PurchaseOrder, SalesHistory } = require('../models');
const { authenticateToken, canManagePurchases, canViewReports } = require('../middleware/auth');
const AuditService = require('../services/auditService');

const router = express.Router();

// Get Reorder Recommendations (Transparent replenishment intelligence)
router.get('/reorder-recommendations', authenticateToken, canViewReports, async (req, res) => {
  try {
    const products = await Product.find({
      status: { $ne: 'archived' },
      $expr: { $lte: ['$quantity', '$reorder_level'] }
    }).populate('supplier_id', 'name contact_person email phone');

    // Get 60 days sales history for sales velocity
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const salesStats = await SalesHistory.aggregate([
      { $match: { sale_date: { $gte: sixtyDaysAgo } } },
      {
        $group: {
          _id: '$product_id',
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    const salesMap = {};
    salesStats.forEach((s) => {
      salesMap[s._id.toString()] = s.totalQuantity;
    });

    const recommendations = products.map((prod) => {
      const soldLast60 = salesMap[prod._id.toString()] || 0;
      const avgDailySales = soldLast60 / 60;
      const leadTime = prod.lead_time_days || 7;
      const currentStock = prod.quantity || 0;
      const reorderLevel = prod.reorder_level || 10;
      const maxStock = prod.maximum_stock || 100;

      // Recommended order quantity: Replenish up to Maximum Stock or at least (Lead Time Demand + Safety Stock)
      const leadTimeDemand = Math.ceil(avgDailySales * leadTime);
      const suggestedQty = Math.max(
        maxStock - currentStock,
        Math.max(reorderLevel * 2, 20) - currentStock,
        leadTimeDemand + 10
      );

      const daysOfCoverage = avgDailySales > 0 ? parseFloat((currentStock / avgDailySales).toFixed(1)) : null;

      return {
        productId: prod._id,
        sku: prod.sku,
        name: prod.name,
        category: prod.category,
        brand: prod.brand,
        unitOfMeasure: prod.unit_of_measure,
        currentStock,
        reorderLevel,
        leadTimeDays: leadTime,
        avgDailySales: parseFloat(avgDailySales.toFixed(2)),
        daysOfCoverage,
        suggestedOrderQty: Math.max(1, suggestedQty),
        unitCost: prod.cost,
        estimatedCost: parseFloat((Math.max(1, suggestedQty) * prod.cost).toFixed(2)),
        supplierId: prod.supplier_id?._id || null,
        supplierName: prod.supplier_id?.name || 'No Supplier Assigned',
        supplierContact: prod.supplier_id?.contact_person || '',
        urgency: currentStock <= 0 ? 'CRITICAL_OUT_OF_STOCK' : currentStock <= (prod.minimum_stock || 5) ? 'URGENT' : 'NORMAL'
      };
    });

    // Group by supplier for easy batch purchase order generation
    const groupedBySupplier = {};
    recommendations.forEach((rec) => {
      const suppKey = rec.supplierId ? rec.supplierId.toString() : 'unassigned';
      if (!groupedBySupplier[suppKey]) {
        groupedBySupplier[suppKey] = {
          supplierId: rec.supplierId,
          supplierName: rec.supplierName,
          items: [],
          totalEstimatedCost: 0
        };
      }
      groupedBySupplier[suppKey].items.push(rec);
      groupedBySupplier[suppKey].totalEstimatedCost += rec.estimatedCost;
    });

    res.json({
      total_items_needing_reorder: recommendations.length,
      recommendations,
      grouped_by_supplier: Object.values(groupedBySupplier)
    });
  } catch (error) {
    console.error('Reorder recommendations error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create Purchase Orders from Selected Recommendations (User-confirmed 1-click PO creation)
router.post('/create-orders-from-recommendations', authenticateToken, canManagePurchases, async (req, res) => {
  try {
    const { supplierGroups } = req.body;

    if (!supplierGroups || !Array.isArray(supplierGroups) || supplierGroups.length === 0) {
      return res.status(400).json({ error: 'No supplier groups provided to generate orders' });
    }

    const createdPOs = [];

    for (const group of supplierGroups) {
      if (!group.supplierId) continue; // Skip unassigned suppliers

      const orderItems = [];
      let totalAmount = 0;

      for (const item of group.items) {
        const prod = await Product.findById(item.productId);
        if (!prod) continue;

        const qty = parseInt(item.quantity || item.suggestedOrderQty, 10);
        const unitPrice = parseFloat(item.unitCost || prod.cost);
        const lineTotal = qty * unitPrice;

        totalAmount += lineTotal;
        orderItems.push({
          product_id: prod._id,
          quantity: qty,
          received_quantity: 0,
          unit_price: unitPrice,
          discount: 0,
          total_price: parseFloat(lineTotal.toFixed(2))
        });
      }

      if (orderItems.length === 0) continue;

      const orderNumber = `PO-REC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const po = await PurchaseOrder.create({
        order_number: orderNumber,
        supplier_id: group.supplierId,
        subtotal: parseFloat(totalAmount.toFixed(2)),
        total_amount: parseFloat(totalAmount.toFixed(2)),
        created_by: req.user.id,
        status: 'draft',
        notes: 'Generated from intelligent reorder recommendation system',
        items: orderItems
      });

      createdPOs.push({
        id: po._id,
        order_number: po.order_number,
        supplier_id: po.supplier_id,
        total_amount: po.total_amount,
        items_count: orderItems.length
      });

      await AuditService.log({
        userId: req.user.id,
        username: req.user.username,
        action: 'PO_CREATE_FROM_RECOMMENDATION',
        entity: 'PurchaseOrder',
        entityId: po._id,
        details: { order_number: orderNumber, total_amount: totalAmount },
        req
      });
    }

    res.status(201).json({
      message: `Successfully created ${createdPOs.length} draft purchase order(s). Review and approve them in Purchase Orders.`,
      orders: createdPOs
    });
  } catch (error) {
    console.error('Create orders from recommendations error:', error);
    res.status(500).json({ error: error.message || 'Error generating purchase orders' });
  }
});

// Demand Forecasting Algorithm for a specific product
router.get('/demand-forecast/:productId', authenticateToken, canViewReports, async (req, res) => {
  try {
    const { productId } = req.params;
    const { days = 60 } = req.query;

    const analysisDays = parseInt(days, 10) || 60;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - analysisDays);

    const [product, salesData] = await Promise.all([
      Product.findById(productId).populate('supplier_id', 'name contact_person email phone'),
      SalesHistory.find({
        product_id: productId,
        sale_date: { $gte: startDate }
      }).sort({ sale_date: 1 })
    ]);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const totalSold = salesData.reduce((sum, s) => sum + s.quantity, 0);
    const avgDailySales = totalSold / analysisDays;

    const forecast30 = Math.ceil(avgDailySales * 30);
    const forecast60 = Math.ceil(avgDailySales * 60);
    const forecast90 = Math.ceil(avgDailySales * 90);

    const currentStock = product.quantity || 0;
    const daysOfCover = avgDailySales > 0 ? parseFloat((currentStock / avgDailySales).toFixed(1)) : null;

    res.json({
      product: {
        id: product._id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        current_stock: currentStock,
        reorder_level: product.reorder_level,
        supplier_name: product.supplier_id?.name || 'N/A'
      },
      algorithm: {
        method: 'Sales Velocity & Moving Average Forecast',
        explanation:
          'Calculates average daily consumption rate over the lookback window, projects future demand for 30/60/90 days, and determines days of stock coverage before stockout.',
        lookback_window_days: analysisDays
      },
      historical_metrics: {
        total_units_sold: totalSold,
        average_daily_sales: parseFloat(avgDailySales.toFixed(2)),
        days_of_coverage: daysOfCover
      },
      forecast: {
        next_30_days: forecast30,
        next_60_days: forecast60,
        next_90_days: forecast90
      },
      recommendation: {
        suggested_order_quantity: Math.max(0, forecast30 - currentStock),
        stockout_risk: daysOfCover !== null && daysOfCover < 7 ? 'HIGH' : daysOfCover !== null && daysOfCover < 15 ? 'MEDIUM' : 'LOW'
      }
    });
  } catch (error) {
    console.error('Demand forecast error:', error);
    res.status(500).json({ error: 'Database error calculating forecast' });
  }
});

// Inventory Optimization Analysis
router.get('/inventory-optimization', authenticateToken, canViewReports, async (req, res) => {
  try {
    const { days = 60 } = req.query;
    const analysisWindowDays = Math.max(parseInt(days, 10) || 60, 7);
    const windowStartDate = new Date();
    windowStartDate.setDate(windowStartDate.getDate() - analysisWindowDays);

    const [products, salesHistory] = await Promise.all([
      Product.find({ status: { $ne: 'archived' } }),
      SalesHistory.aggregate([
        { $match: { sale_date: { $gte: windowStartDate } } },
        {
          $group: {
            _id: '$product_id',
            totalQuantity: { $sum: '$quantity' },
            firstSaleDate: { $min: '$sale_date' },
            lastSaleDate: { $max: '$sale_date' }
          }
        }
      ])
    ]);

    const salesByProduct = new Map();
    salesHistory.forEach((e) => salesByProduct.set(e._id.toString(), e));

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
      let demandClassification = 'no_demand';

      if (salesEntry) {
        totalSold = salesEntry.totalQuantity || 0;
        avgDailySales = totalSold / analysisWindowDays;

        if (avgDailySales === 0) demandClassification = 'no_demand';
        else if (avgDailySales < 0.3) demandClassification = 'slow_moving';
        else if (avgDailySales < 1.5) demandClassification = 'normal';
        else demandClassification = 'fast_moving';
      }

      const daysOfCover = avgDailySales > 0 ? parseFloat((currentQty / avgDailySales).toFixed(1)) : null;

      let stockClassification = 'balanced';
      if (avgDailySales > 0) {
        if (daysOfCover !== null && daysOfCover < 7) {
          stockClassification = 'understocked';
          understocked++;
        } else if (daysOfCover !== null && daysOfCover > 60) {
          stockClassification = 'overstocked';
          overstocked++;
        }
      } else if (currentQty > 0) {
        stockClassification = 'stagnant';
        slowMoving++;
      }

      const suggestedReorderLevel = Math.max(5, Math.round(avgDailySales * (product.lead_time_days || 7) + 5));

      results.push({
        product_id: product._id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        current_stock: currentQty,
        reorder_level: reorderLevel,
        suggested_reorder_level: suggestedReorderLevel,
        avg_daily_sales: parseFloat(avgDailySales.toFixed(2)),
        days_of_cover: daysOfCover,
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

// Legacy auto-reorder compatibility endpoint
router.post('/auto-reorder', authenticateToken, canManagePurchases, async (req, res) => {
  try {
    const products = await Product.find({
      status: { $ne: 'archived' },
      $expr: { $lte: ['$quantity', '$reorder_level'] }
    }).populate('supplier_id', 'name');

    if (products.length === 0) {
      return res.json({ message: 'No products need reordering', orders: [], skipped: [] });
    }

    const supplierGroups = {};
    const skipped = [];

    products.forEach((p) => {
      if (!p.supplier_id) {
        skipped.push({ product_id: p._id, sku: p.sku, name: p.name, reason: 'No supplier assigned' });
        return;
      }
      const sId = p.supplier_id._id.toString();
      if (!supplierGroups[sId]) {
        supplierGroups[sId] = {
          supplier_id: p.supplier_id._id,
          supplier_name: p.supplier_id.name,
          items: []
        };
      }
      const qty = Math.max(p.reorder_level * 2, 20);
      supplierGroups[sId].items.push({
        product_id: p._id,
        quantity: qty,
        unit_price: p.cost,
        total_price: qty * p.cost
      });
    });

    const createdOrders = [];
    for (const sId of Object.keys(supplierGroups)) {
      const grp = supplierGroups[sId];
      const totalAmount = grp.items.reduce((sum, it) => sum + it.total_price, 0);
      const orderNumber = `PO-AUTO-${Date.now()}-${sId.slice(-4)}`;

      const po = await PurchaseOrder.create({
        order_number: orderNumber,
        supplier_id: grp.supplier_id,
        total_amount: parseFloat(totalAmount.toFixed(2)),
        created_by: req.user.id,
        status: 'draft',
        notes: 'Automated reorder PO',
        items: grp.items
      });

      createdOrders.push({ id: po._id, order_number: orderNumber, supplier_name: grp.supplier_name });
    }

    res.json({
      message: `Created ${createdOrders.length} draft purchase order(s).`,
      orders: createdOrders,
      skipped
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Algorithms summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const lowStockCount = await Product.countDocuments({
      status: { $ne: 'archived' },
      $expr: { $lte: ['$quantity', '$reorder_level'] }
    });

    const pendingAutoOrders = await PurchaseOrder.countDocuments({
      order_number: { $regex: /^PO-(AUTO|REC)-/ },
      status: { $in: ['draft', 'submitted', 'pending'] }
    });

    res.json({
      auto_reorder: {
        products_needing_reorder: lowStockCount,
        pending_auto_orders: pendingAutoOrders
      },
      demand_forecast: {
        available_for: 'all_products_with_sales_history'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
