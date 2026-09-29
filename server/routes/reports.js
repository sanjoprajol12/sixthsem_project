const express = require('express');
const { Product, Supplier, SalesOrder, PurchaseOrder, SalesHistory, InventoryTransaction, Damage } = require('../models');
const { authenticateToken, canViewReports } = require('../middleware/auth');
const InventoryService = require('../services/inventoryService');

const router = express.Router();

// Executive Business Summary (Revenue, COGS, Gross Profit, Valuation, Pending Actions)
router.get('/executive-summary', authenticateToken, canViewReports, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days, 10));

    const [
      salesOrders,
      products,
      pendingPOs,
      damages,
      valuationData
    ] = await Promise.all([
      SalesOrder.find({
        created_at: { $gte: startDate },
        status: { $nin: ['cancelled', 'draft'] }
      }),
      Product.find({ status: { $ne: 'archived' } }),
      PurchaseOrder.find({ status: { $in: ['submitted', 'pending', 'approved'] } }),
      Damage.find({ created_at: { $gte: startDate } }),
      InventoryService.calculateValuation('weighted_average')
    ]);

    let totalRevenue = 0;
    let totalCOGS = 0;
    salesOrders.forEach((so) => {
      totalRevenue += so.total_amount || 0;
      totalCOGS += so.total_cost || 0;
    });

    const grossProfit = totalRevenue - totalCOGS;
    const grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    let totalStockUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let criticalStockCount = 0;

    products.forEach((p) => {
      const q = p.quantity || 0;
      totalStockUnits += q;
      if (q <= 0) outOfStockCount++;
      else if (q <= (p.minimum_stock || 5)) criticalStockCount++;
      else if (q <= (p.reorder_level || 10)) lowStockCount++;
    });

    const totalDamageLoss = damages.reduce((sum, d) => sum + (d.total_loss || 0), 0);

    res.json({
      period_days: parseInt(days, 10),
      financials: {
        total_revenue: parseFloat(totalRevenue.toFixed(2)),
        total_cogs: parseFloat(totalCOGS.toFixed(2)),
        gross_profit: parseFloat(grossProfit.toFixed(2)),
        gross_margin_percent: parseFloat(grossMarginPercent.toFixed(1)),
        inventory_valuation: valuationData.totalValuation,
        damage_loss: parseFloat(totalDamageLoss.toFixed(2))
      },
      inventory: {
        total_products: products.length,
        total_units: totalStockUnits,
        out_of_stock_count: outOfStockCount,
        critical_stock_count: criticalStockCount,
        low_stock_count: lowStockCount,
        healthy_count: products.length - (outOfStockCount + criticalStockCount + lowStockCount)
      },
      operations: {
        total_sales_orders: salesOrders.length,
        pending_purchase_orders: pendingPOs.length,
        attention_required_count: outOfStockCount + criticalStockCount + lowStockCount + pendingPOs.length
      }
    });
  } catch (error) {
    console.error('Executive summary error:', error);
    res.status(500).json({ error: 'Database error generating executive summary' });
  }
});

// Stock levels report with detailed status
router.get('/stock-levels', authenticateToken, canViewReports, async (req, res) => {
  try {
    const products = await Product.find({ status: { $ne: 'archived' } })
      .populate('supplier_id', 'name')
      .sort({ quantity: 1 });

    const formattedProducts = products.map((product) => {
      const p = product.toObject({ virtuals: true });
      return {
        id: p._id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        brand: p.brand,
        unit_of_measure: p.unit_of_measure,
        quantity: p.quantity,
        reorder_level: p.reorder_level,
        minimum_stock: p.minimum_stock,
        maximum_stock: p.maximum_stock,
        cost: p.cost,
        price: p.price,
        stock_status: p.stock_status,
        supplier_name: product.supplier_id?.name || 'N/A'
      };
    });

    res.json(formattedProducts);
  } catch (error) {
    console.error('Stock levels error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Sales trends and revenue vs cost breakdown
router.get('/sales-trends', authenticateToken, canViewReports, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days, 10));

    const salesData = await SalesOrder.aggregate([
      {
        $match: {
          created_at: { $gte: startDate },
          status: { $nin: ['cancelled', 'draft'] }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$created_at' }
          },
          total_orders: { $sum: 1 },
          total_revenue: { $sum: '$total_amount' },
          total_cogs: { $sum: '$total_cost' },
          gross_profit: { $sum: '$gross_profit' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const formatted = salesData.map((d) => ({
      date: d._id,
      orders: d.total_orders,
      revenue: parseFloat(d.total_revenue.toFixed(2)),
      cogs: parseFloat(d.total_cogs.toFixed(2)),
      profit: parseFloat(d.gross_profit.toFixed(2))
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Sales trends error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Inventory turnover and sales velocity report
router.get('/inventory-turnover', authenticateToken, canViewReports, async (req, res) => {
  try {
    const products = await Product.find({ status: { $ne: 'archived' } }).populate('supplier_id', 'name');
    const salesData = await SalesHistory.aggregate([
      {
        $group: {
          _id: '$product_id',
          total_sold: { $sum: '$quantity' },
          total_revenue: { $sum: { $multiply: ['$quantity', '$unit_price'] } }
        }
      }
    ]);

    const salesMap = {};
    salesData.forEach((item) => {
      salesMap[item._id.toString()] = {
        total_sold: item.total_sold,
        total_revenue: item.total_revenue
      };
    });

    const turnover = products
      .map((product) => {
        const soldInfo = salesMap[product._id.toString()] || { total_sold: 0, total_revenue: 0 };
        const turnoverRate = product.quantity > 0 ? soldInfo.total_sold / product.quantity : 0;

        return {
          id: product._id,
          sku: product.sku,
          name: product.name,
          category: product.category,
          current_stock: product.quantity,
          unit_cost: product.cost,
          total_sold: soldInfo.total_sold,
          total_revenue: parseFloat(soldInfo.total_revenue.toFixed(2)),
          turnover_rate: parseFloat(turnoverRate.toFixed(2)),
          supplier_name: product.supplier_id?.name || 'N/A'
        };
      })
      .sort((a, b) => b.turnover_rate - a.turnover_rate);

    res.json(turnover);
  } catch (error) {
    console.error('Inventory turnover error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Low stock and reorder alerts
router.get('/low-stock-alerts', authenticateToken, canViewReports, async (req, res) => {
  try {
    const products = await Product.find({
      status: { $ne: 'archived' },
      $expr: { $lte: ['$quantity', '$reorder_level'] }
    })
      .populate('supplier_id', 'name contact_person phone email')
      .sort({ quantity: 1 });

    const alerts = products.map((product) => {
      const p = product.toObject({ virtuals: true });
      return {
        ...p,
        id: p._id,
        supplier_name: product.supplier_id?.name || 'No Supplier Assigned',
        supplier_phone: product.supplier_id?.phone || '',
        suggested_reorder_qty: Math.max(product.reorder_level * 2, 20) - product.quantity,
        estimated_cost: (Math.max(product.reorder_level * 2, 20) - product.quantity) * product.cost
      };
    });

    res.json(alerts);
  } catch (error) {
    console.error('Low stock alerts error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Top selling products with margin performance
router.get('/top-selling', authenticateToken, canViewReports, async (req, res) => {
  try {
    const { limit = 10, days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days, 10));

    const topProducts = await SalesHistory.aggregate([
      {
        $match: {
          sale_date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$product_id',
          total_sold: { $sum: '$quantity' },
          total_revenue: { $sum: { $multiply: ['$quantity', '$unit_price'] } }
        }
      },
      {
        $sort: { total_sold: -1 }
      },
      {
        $limit: parseInt(limit, 10)
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $project: {
          id: '$_id',
          sku: '$product.sku',
          name: '$product.name',
          category: '$product.category',
          unit_cost: '$product.cost',
          total_sold: 1,
          total_revenue: 1,
          total_cogs: { $multiply: ['$total_sold', '$product.cost'] },
          profit: { $subtract: ['$total_revenue', { $multiply: ['$total_sold', '$product.cost'] }] }
        }
      }
    ]);

    res.json(topProducts);
  } catch (error) {
    console.error('Top selling error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
