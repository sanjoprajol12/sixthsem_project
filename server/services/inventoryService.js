const mongoose = require('mongoose');
const {
  Product,
  InventoryTransaction,
  PurchaseOrder,
  SalesOrder,
  Damage,
  StockAdjustment,
  SalesHistory
} = require('../models');
const AuditService = require('./auditService');
const NotificationService = require('./notificationService');

class InventoryService {
  /**
   * Internal helper: modify product stock and write an immutable ledger transaction
   */
  static async applyStockMovement({
    productId,
    quantityChange, // positive (in) or negative (out)
    transactionType,
    unitCost,
    referenceType,
    referenceId,
    referenceNumber,
    locationId,
    performedBy,
    batchNumber = '',
    notes = ''
  }) {
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const previousQuantity = product.quantity || 0;
    const newQuantity = previousQuantity + quantityChange;

    if (newQuantity < 0) {
      throw new Error(
        `Insufficient stock for "${product.name}" (SKU: ${product.sku}). Available: ${previousQuantity}, Requested reduction: ${Math.abs(quantityChange)}`
      );
    }

    // Update product stock and optionally cost if provided and positive
    product.quantity = newQuantity;
    if (unitCost !== undefined && unitCost > 0 && quantityChange > 0) {
      // Update moving weighted average cost if desired or keep existing cost
      product.cost = unitCost;
    }
    await product.save();

    // Create the ledger transaction record
    const transaction = await InventoryTransaction.create({
      product_id: product._id,
      transaction_type: transactionType,
      quantity: Math.abs(quantityChange),
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      unit_cost: unitCost !== undefined ? unitCost : (product.cost || 0),
      reference_type: referenceType,
      reference_id: referenceId || null,
      reference_number: referenceNumber || '',
      location_id: locationId || product.location_id || null,
      performed_by: performedBy || null,
      batch_number: batchNumber,
      notes: notes || ''
    });

    // Run stock threshold check asynchronously
    NotificationService.checkStockThresholds(product._id);

    return { product, transaction };
  }

  /**
   * Receive goods from a Purchase Order (Supports Full and Partial Receiving)
   */
  static async receivePurchaseOrder({ purchaseOrderId, itemsReceived, userId, locationId, notes, req }) {
    const order = await PurchaseOrder.findById(purchaseOrderId).populate('items.product_id');
    if (!order) {
      throw new Error('Purchase order not found');
    }

    const validStatuses = ['submitted', 'approved', 'ordered', 'partially_received', 'pending', 'processing'];
    if (!validStatuses.includes(order.status)) {
      throw new Error(`Cannot receive goods for purchase order with status "${order.status}"`);
    }

    let totalNewlyReceived = 0;
    const movementLogs = [];

    // Process each item to receive
    for (const recItem of itemsReceived) {
      const orderItem = order.items.find(
        (it) => it._id.toString() === recItem.itemId || (it.product_id?._id || it.product_id).toString() === recItem.productId
      );

      if (!orderItem) {
        continue;
      }

      const currentReceived = orderItem.received_quantity || 0;
      const orderedQty = orderItem.quantity;
      const maxReceivable = orderedQty - currentReceived;
      const qtyToReceive = parseInt(recItem.quantityReceived, 10);

      if (isNaN(qtyToReceive) || qtyToReceive <= 0) {
        continue;
      }

      if (qtyToReceive > maxReceivable) {
        throw new Error(
          `Cannot receive ${qtyToReceive} units. Maximum remaining receivable for this item is ${maxReceivable} units.`
        );
      }

      const prodId = orderItem.product_id?._id || orderItem.product_id;
      const unitCost = orderItem.unit_price;

      // Apply inventory stock increase
      const { transaction } = await this.applyStockMovement({
        productId: prodId,
        quantityChange: qtyToReceive,
        transactionType: 'PURCHASE_RECEIVE',
        unitCost,
        referenceType: 'PurchaseOrder',
        referenceId: order._id,
        referenceNumber: order.order_number,
        locationId: locationId || order.location_id,
        performedBy: userId,
        notes: notes || `Goods received against PO ${order.order_number}`
      });

      orderItem.received_quantity = currentReceived + qtyToReceive;
      totalNewlyReceived += qtyToReceive;
      movementLogs.push({ productId: prodId, quantity: qtyToReceive });
    }

    if (totalNewlyReceived === 0) {
      throw new Error('No items were received. Please specify valid quantities to receive.');
    }

    // Determine new status of the Purchase Order
    const allCompleted = order.items.every((it) => (it.received_quantity || 0) >= it.quantity);
    order.status = allCompleted ? 'received' : 'partially_received';
    order.received_at = new Date();
    await order.save();

    await AuditService.log({
      userId,
      action: 'PO_RECEIVE',
      entity: 'PurchaseOrder',
      entityId: order._id,
      details: {
        order_number: order.order_number,
        received_items: movementLogs,
        new_status: order.status
      },
      req
    });

    await NotificationService.notify({
      title: `Goods Received: ${order.order_number}`,
      message: `Purchase order ${order.order_number} has been updated to status: ${order.status.toUpperCase()} (${totalNewlyReceived} units received).`,
      type: 'po_received',
      severity: 'success',
      targetRole: 'all',
      referenceType: 'PurchaseOrder',
      referenceId: order._id
    });

    return order;
  }

  /**
   * Deduct stock for a confirmed/completed Sales Order
   */
  static async deductSale({ salesOrderId, userId, locationId, req }) {
    const order = await SalesOrder.findById(salesOrderId).populate('items.product_id');
    if (!order) {
      throw new Error('Sales order not found');
    }

    if (order.stock_deducted) {
      return order; // Already deducted safely
    }

    // 1. Verify stock availability for all items first (prevent partial deductions)
    for (const item of order.items) {
      const prodId = item.product_id?._id || item.product_id;
      const product = await Product.findById(prodId);
      if (!product) {
        throw new Error(`Product not found for line item`);
      }
      if (product.quantity < item.quantity) {
        throw new Error(
          `Insufficient stock for "${product.name}". Available: ${product.quantity}, Required: ${item.quantity}`
        );
      }
    }

    // 2. Apply deduction and calculate cost of goods sold (COGS)
    let totalCost = 0;
    for (const item of order.items) {
      const prodId = item.product_id?._id || item.product_id;
      const product = await Product.findById(prodId);
      const unitCost = product.cost || 0;
      item.unit_cost = unitCost;

      totalCost += unitCost * item.quantity;

      await this.applyStockMovement({
        productId: prodId,
        quantityChange: -item.quantity,
        transactionType: 'SALE_DEDUCT',
        unitCost,
        referenceType: 'SalesOrder',
        referenceId: order._id,
        referenceNumber: order.order_number,
        locationId: locationId || order.location_id,
        performedBy: userId,
        notes: `Sale completed: ${order.order_number}`
      });

      // Write to SalesHistory for demand forecasting algorithms
      await SalesHistory.create({
        product_id: prodId,
        quantity: item.quantity,
        sale_date: new Date(),
        unit_price: item.unit_price,
        sales_order_id: order._id
      });
    }

    order.stock_deducted = true;
    order.total_cost = totalCost;
    order.gross_profit = order.total_amount - totalCost;
    await order.save();

    await AuditService.log({
      userId,
      action: 'SALE_DEDUCT',
      entity: 'SalesOrder',
      entityId: order._id,
      details: {
        order_number: order.order_number,
        total_amount: order.total_amount,
        gross_profit: order.gross_profit
      },
      req
    });

    return order;
  }

  /**
   * Cancel a Sales Order and restore deducted inventory exactly once
   */
  static async cancelSale({ salesOrderId, userId, reason, req }) {
    const order = await SalesOrder.findById(salesOrderId).populate('items.product_id');
    if (!order) {
      throw new Error('Sales order not found');
    }

    if (order.status === 'cancelled') {
      throw new Error('This sales order is already cancelled');
    }

    // Restore stock if previously deducted
    if (order.stock_deducted) {
      for (const item of order.items) {
        const prodId = item.product_id?._id || item.product_id;
        const qtyToRestore = item.quantity - (item.returned_quantity || 0);

        if (qtyToRestore > 0) {
          await this.applyStockMovement({
            productId: prodId,
            quantityChange: qtyToRestore,
            transactionType: 'SALE_RETURN',
            unitCost: item.unit_cost || 0,
            referenceType: 'SalesOrder',
            referenceId: order._id,
            referenceNumber: order.order_number,
            locationId: order.location_id,
            performedBy: userId,
            notes: `Restored stock on order cancellation: ${reason || 'Cancelled by user'}`
          });
        }
      }
      order.stock_deducted = false;
    }

    order.status = 'cancelled';
    order.cancellation_reason = reason || 'Cancelled by staff';
    order.cancelled_at = new Date();
    await order.save();

    await AuditService.log({
      userId,
      action: 'SALE_CANCEL',
      entity: 'SalesOrder',
      entityId: order._id,
      details: {
        order_number: order.order_number,
        reason: order.cancellation_reason,
        stock_restored: true
      },
      req
    });

    return order;
  }

  /**
   * Customer Return workflow: Restores items to stock linked to original sale
   */
  static async processCustomerReturn({ salesOrderId, returnItems, reason, userId, req }) {
    const order = await SalesOrder.findById(salesOrderId).populate('items.product_id');
    if (!order) {
      throw new Error('Sales order not found');
    }

    let totalReturnedUnits = 0;

    for (const ret of returnItems) {
      const orderItem = order.items.find(
        (it) => it._id.toString() === ret.itemId || (it.product_id?._id || it.product_id).toString() === ret.productId
      );

      if (!orderItem) continue;

      const currentReturned = orderItem.returned_quantity || 0;
      const maxReturnable = orderItem.quantity - currentReturned;
      const qty = parseInt(ret.quantity, 10);

      if (isNaN(qty) || qty <= 0) continue;
      if (qty > maxReturnable) {
        throw new Error(
          `Cannot return ${qty} units. Maximum returnable quantity for this item is ${maxReturnable}.`
        );
      }

      const prodId = orderItem.product_id?._id || orderItem.product_id;

      // Increase inventory back
      await this.applyStockMovement({
        productId: prodId,
        quantityChange: qty,
        transactionType: 'SALE_RETURN',
        unitCost: orderItem.unit_cost || 0,
        referenceType: 'CustomerReturn',
        referenceId: order._id,
        referenceNumber: order.order_number,
        locationId: order.location_id,
        performedBy: userId,
        notes: `Customer return: ${reason || 'Defective/Customer choice'}`
      });

      orderItem.returned_quantity = currentReturned + qty;
      totalReturnedUnits += qty;
    }

    if (totalReturnedUnits === 0) {
      throw new Error('No items specified for return');
    }

    await order.save();

    await AuditService.log({
      userId,
      action: 'CUSTOMER_RETURN',
      entity: 'SalesOrder',
      entityId: order._id,
      details: {
        order_number: order.order_number,
        units_returned: totalReturnedUnits,
        reason
      },
      req
    });

    return order;
  }

  /**
   * Damage / Loss Management: Deducts stock, creates Damage record, NEVER deletes product!
   */
  static async recordDamage({ productId, quantity, damageType, remark, userId, locationId, req }) {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Quantity must be at least 1');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (qty > product.quantity) {
      throw new Error(
        `Damage quantity (${qty}) cannot exceed currently available stock (${product.quantity})`
      );
    }

    const unitCost = product.cost || 0;
    const totalLoss = unitCost * qty;

    // 1. Create Damage record with full snapshot
    const damage = await Damage.create({
      product_id: product._id,
      quantity: qty,
      damage_type: damageType || 'Broken / Transit Damage',
      remark: remark || '',
      unit_cost: unitCost,
      total_loss: totalLoss,
      location_id: locationId || product.location_id,
      recorded_by: userId,
      deleted_by: userId, // backwards compatibility
      product_snapshot: {
        sku: product.sku,
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        cost: product.cost,
        supplier_id: product.supplier_id || null,
        barcode: product.barcode || null
      }
    });

    // 2. Apply stock movement via centralized engine
    await this.applyStockMovement({
      productId: product._id,
      quantityChange: -qty,
      transactionType: 'DAMAGE',
      unitCost,
      referenceType: 'Damage',
      referenceId: damage._id,
      referenceNumber: `DMG-${damage._id.toString().slice(-6).toUpperCase()}`,
      locationId: locationId || product.location_id,
      performedBy: userId,
      notes: `Damage recorded: [${damage.damage_type}] ${remark || ''}`
    });

    await AuditService.log({
      userId,
      action: 'DAMAGE_RECORDED',
      entity: 'Damage',
      entityId: damage._id,
      details: {
        product_sku: product.sku,
        product_name: product.name,
        quantity: qty,
        damage_type: damage.damage_type,
        total_loss: totalLoss
      },
      req
    });

    return damage;
  }

  /**
   * Dedicated Inventory Adjustment: Physical count vs System count reconciliation
   */
  static async adjustStock({ items, reason, notes, locationId, userId, req }) {
    if (!items || !items.length) {
      throw new Error('At least one item is required for adjustment');
    }

    const adjustmentNumber = `ADJ-${Date.now()}`;
    const adjustmentItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) continue;

      const systemQty = product.quantity;
      const physicalQty = parseInt(item.physicalQuantity, 10);
      if (isNaN(physicalQty) || physicalQty < 0) {
        throw new Error(`Invalid physical count for product "${product.name}"`);
      }

      const difference = physicalQty - systemQty;
      if (difference === 0) continue; // No change needed

      const transactionType = difference > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';

      // Apply the difference
      await this.applyStockMovement({
        productId: product._id,
        quantityChange: difference,
        transactionType,
        unitCost: product.cost || 0,
        referenceType: 'StockAdjustment',
        referenceNumber: adjustmentNumber,
        locationId: locationId || product.location_id,
        performedBy: userId,
        notes: `Physical reconciliation: ${reason} (${difference > 0 ? '+' : ''}${difference})`
      });

      adjustmentItems.push({
        product_id: product._id,
        system_quantity: systemQty,
        physical_quantity: physicalQty,
        difference,
        unit_cost: product.cost || 0,
        item_notes: item.notes || ''
      });
    }

    if (adjustmentItems.length === 0) {
      throw new Error('No variances detected between system stock and physical counts.');
    }

    const stockAdjustment = await StockAdjustment.create({
      adjustment_number: adjustmentNumber,
      reason,
      status: 'applied',
      location_id: locationId,
      notes: notes || '',
      performed_by: userId,
      items: adjustmentItems
    });

    await AuditService.log({
      userId,
      action: 'STOCK_ADJUSTMENT',
      entity: 'StockAdjustment',
      entityId: stockAdjustment._id,
      details: {
        adjustment_number: adjustmentNumber,
        reason,
        items_count: adjustmentItems.length
      },
      req
    });

    return stockAdjustment;
  }

  /**
   * Inventory Valuation: FIFO, LIFO, and Weighted Average
   */
  static async calculateValuation(method = 'weighted_average') {
    const products = await Product.find({ status: { $ne: 'archived' } })
      .populate('supplier_id', 'name')
      .lean();

    let grandTotalUnits = 0;
    let grandTotalValue = 0;

    const valuationRows = [];

    for (const prod of products) {
      const qty = prod.quantity || 0;
      grandTotalUnits += qty;

      if (qty <= 0) {
        valuationRows.push({
          productId: prod._id,
          sku: prod.sku,
          name: prod.name,
          category: prod.category,
          supplierName: prod.supplier_id?.name || 'N/A',
          quantity: 0,
          unitCost: prod.cost || 0,
          inventoryValue: 0,
          valuationMethod: method.toUpperCase(),
          calculationDetails: '0 units in stock'
        });
        continue;
      }

      // Query purchase transactions for cost layering
      const purchaseTxs = await InventoryTransaction.find({
        product_id: prod._id,
        transaction_type: { $in: ['PURCHASE_RECEIVE', 'purchase'] }
      })
        .sort({ created_at: method === 'lifo' ? -1 : 1 })
        .lean();

      let calculatedValue = 0;
      let explanation = '';

      if (method === 'weighted_average' || purchaseTxs.length === 0) {
        // Weighted average cost basis
        let avgCost = prod.cost || 0;
        if (purchaseTxs.length > 0) {
          const totalSpent = purchaseTxs.reduce((sum, tx) => sum + (tx.quantity * tx.unit_cost), 0);
          const totalBought = purchaseTxs.reduce((sum, tx) => sum + tx.quantity, 0);
          if (totalBought > 0) {
            avgCost = totalSpent / totalBought;
          }
        }
        calculatedValue = qty * avgCost;
        explanation = `${qty} units @ NPR ${avgCost.toFixed(2)} (Weighted Average Cost)`;
      } else if (method === 'fifo') {
        // FIFO: Stock consists of the most recently purchased batches
        // Order purchases newest first for remaining quantity coverage
        const newestFirst = [...purchaseTxs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        let remainingQty = qty;
        let layerValue = 0;
        const layers = [];

        for (const tx of newestFirst) {
          if (remainingQty <= 0) break;
          const take = Math.min(remainingQty, tx.quantity);
          layerValue += take * tx.unit_cost;
          layers.push(`${take} @ NPR ${tx.unit_cost}`);
          remainingQty -= take;
        }

        if (remainingQty > 0) {
          // If past purchases don't cover all stock, price remaining at default product cost
          layerValue += remainingQty * (prod.cost || 0);
          layers.push(`${remainingQty} @ NPR ${prod.cost || 0} (Default Cost)`);
        }

        calculatedValue = layerValue;
        explanation = `FIFO layers: ${layers.join(' + ')}`;
      } else if (method === 'lifo') {
        // LIFO: Stock valued based on earliest acquisition layers
        const oldestFirst = [...purchaseTxs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        let remainingQty = qty;
        let layerValue = 0;
        const layers = [];

        for (const tx of oldestFirst) {
          if (remainingQty <= 0) break;
          const take = Math.min(remainingQty, tx.quantity);
          layerValue += take * tx.unit_cost;
          layers.push(`${take} @ NPR ${tx.unit_cost}`);
          remainingQty -= take;
        }

        if (remainingQty > 0) {
          layerValue += remainingQty * (prod.cost || 0);
          layers.push(`${remainingQty} @ NPR ${prod.cost || 0} (Default Cost)`);
        }

        calculatedValue = layerValue;
        explanation = `LIFO layers: ${layers.join(' + ')}`;
      }

      grandTotalValue += calculatedValue;

      valuationRows.push({
        productId: prod._id,
        sku: prod.sku,
        name: prod.name,
        category: prod.category,
        supplierName: prod.supplier_id?.name || 'N/A',
        quantity: qty,
        unitCost: qty > 0 ? calculatedValue / qty : (prod.cost || 0),
        inventoryValue: parseFloat(calculatedValue.toFixed(2)),
        valuationMethod: method.toUpperCase(),
        calculationDetails: explanation
      });
    }

    return {
      method: method.toUpperCase(),
      totalUnits: grandTotalUnits,
      totalValuation: parseFloat(grandTotalValue.toFixed(2)),
      items: valuationRows
    };
  }
}

module.exports = InventoryService;
