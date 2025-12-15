const express = require('express');
const { Product, Supplier, SalesHistory } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Stock levels report
router.get('/stock-levels', authenticateToken, async (req, res) => {
  try {
    const products = await Product.find()
      .select('id sku name quantity reorder_level')
      .sort({ quantity: 1 });

    const formattedProducts = products.map(product => ({
      id: product._id,
      sku: product.sku,
      name: product.name,
      quantity: product.quantity,
      reorder_level: product.reorder_level,
      status: product.quantity <= product.reorder_level ? 'Low Stock' : 'In Stock'
    }));

    res.json(formattedProducts);
  } catch (error) {
    console.error('Stock levels error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Sales trends report
router.get('/sales-trends', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const salesData = await SalesHistory.aggregate([
      {
        $match: {
          sale_date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$sale_date' }
          },
          total_quantity: { $sum: '$quantity' },
          total_revenue: { $sum: { $multiply: ['$quantity', '$unit_price'] } },
          products_sold: { $addToSet: '$product_id' }
        }
      },
      {
        $project: {
          date: '$_id',
          total_quantity: 1,
          total_revenue: 1,
          products_sold: { $size: '$products_sold' }
        }
      },
      {
        $sort: { date: -1 }
      }
    ]);

    res.json(salesData);
  } catch (error) {
    console.error('Sales trends error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Inventory turnover report
router.get('/inventory-turnover', authenticateToken, async (req, res) => {
  try {
    const products = await Product.find();
    const salesData = await SalesHistory.aggregate([
      {
        $group: {
          _id: '$product_id',
          total_sold: { $sum: '$quantity' }
        }
      }
    ]);

    const salesMap = {};
    salesData.forEach(item => {
      salesMap[item._id.toString()] = item.total_sold;
    });

    const turnover = products.map(product => {
      const totalSold = salesMap[product._id.toString()] || 0;
      const turnoverRate = product.quantity > 0 ? totalSold / product.quantity : 0;

      return {
        id: product._id,
        sku: product.sku,
        name: product.name,
        quantity: product.quantity,
        total_sold: totalSold,
        turnover_rate: turnoverRate
      };
    }).sort((a, b) => b.turnover_rate - a.turnover_rate);

    res.json(turnover);
  } catch (error) {
    console.error('Inventory turnover error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Low stock alerts
router.get('/low-stock-alerts', authenticateToken, async (req, res) => {
  try {
    const products = await Product.find({
      $expr: { $lte: ['$quantity', '$reorder_level'] }
    })
      .populate('supplier_id', 'name')
      .sort({ quantity: 1 });

    const alerts = products.map(product => ({
      ...product.toObject(),
      supplier_name: product.supplier_id?.name || null,
      supplier_id: product.supplier_id?._id || null
    }));

    res.json(alerts);
  } catch (error) {
    console.error('Low stock alerts error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Top selling products
router.get('/top-selling', authenticateToken, async (req, res) => {
  try {
    const { limit = 10, days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

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
        $limit: parseInt(limit)
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
          total_sold: 1,
          total_revenue: 1
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
