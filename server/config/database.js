const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
  User,
  Supplier,
  Customer,
  Location,
  Product,
  PurchaseOrder,
  SalesOrder,
  InventoryTransaction,
  SalesHistory,
  Category,
  Damage,
  StockAdjustment,
  Notification
} = require('../models');

let isConnected = false;

const initDatabase = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/InventoryDb';
    await mongoose.connect(mongoURI);
    isConnected = true;
    console.log('Connected to MongoDB database');

    const shouldSeed = process.env.NODE_ENV === 'development' || process.env.SEED_DB === 'true';
    if (shouldSeed) {
      await seedData();
    }
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    // Check if data already exists
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Database already initialized. Verifying core seed records...');

      // Ensure default location exists
      const locCount = await Location.countDocuments();
      let mainLocation;
      if (locCount === 0) {
        mainLocation = await Location.create({
          name: 'Main Central Warehouse',
          code: 'LOC-MAIN',
          address: 'Kathmandu Logistics Hub, Bagmati, Nepal',
          is_default: true,
          status: 'active'
        });
        await Location.create({
          name: 'Kathmandu Retail Outlet',
          code: 'LOC-KTM-01',
          address: 'New Baneshwor, Kathmandu, Nepal',
          is_default: false,
          status: 'active'
        });
      } else {
        mainLocation = await Location.findOne({ is_default: true }) || await Location.findOne();
      }

      // Ensure Walk-in customer and key customers exist
      const walkIn = await Customer.findOne({ customer_type: 'walk_in' });
      if (!walkIn) {
        await Customer.create([
          { name: 'Walk-in Customer', customer_code: 'CUST-WALKIN', customer_type: 'walk_in', phone: '9800000000', email: 'walkin@store.local', address: 'Store Counter' },
          { name: 'Evergreen Supermarket Ltd', customer_code: 'CUST-1001', customer_type: 'wholesale', phone: '+977-1-4412389', email: 'procurement@evergreen.com.np', address: 'Baluwatar, Kathmandu', tax_number: 'PAN-302194821', credit_limit: 500000 },
          { name: 'Sunrise Department Stores', customer_code: 'CUST-1002', customer_type: 'wholesale', phone: '+977-1-5523910', email: 'orders@sunrisestores.com.np', address: 'Kumaripati, Lalitpur', tax_number: 'PAN-601928410', credit_limit: 300000 },
          { name: 'Apex Tech Solutions', customer_code: 'CUST-1003', customer_type: 'corporate', phone: '+977-1-4248811', email: 'admin@apextech.com.np', address: 'Putalisadak, Kathmandu' },
          { name: 'Dr. Sandesh Karki', customer_code: 'CUST-1004', customer_type: 'retail', phone: '+977-9841234567', email: 'sandesh.karki@gmail.com', address: 'Lazimpat, Kathmandu' }
        ]);
      }

      // Ensure all business roles exist for easy testing
      const passwordHash = bcrypt.hashSync('admin123', 10);
      const ensureUsers = [
        { username: 'admin', role: 'super_admin', full_name: 'Prakash Sharma (Executive)', email: 'admin@inventory.com' },
        { username: 'inventory_mgr', role: 'inventory_manager', full_name: 'Anita Shakya (Stock Controller)', email: 'inventory@inventory.com' },
        { username: 'sales_rep', role: 'sales_staff', full_name: 'Rohan Shrestha (Sales Officer)', email: 'sales@inventory.com' },
        { username: 'purchase_rep', role: 'purchase_staff', full_name: 'Bikash Adhikari (Procurement)', email: 'purchase@inventory.com' }
      ];

      for (const u of ensureUsers) {
        const found = await User.findOne({ username: u.username });
        if (!found) {
          await User.create({
            username: u.username,
            email: u.email,
            password: passwordHash,
            role: u.role,
            full_name: u.full_name,
            status: 'active'
          });
        } else if (u.username === 'admin' && found.role === 'admin') {
          found.role = 'super_admin';
          await found.save();
        }
      }

      // Check if Inventory Transactions exist, if not seed initial counts
      const txCount = await InventoryTransaction.countDocuments();
      if (txCount === 0) {
        const allProds = await Product.find();
        const adminUser = await User.findOne({ role: 'super_admin' }) || await User.findOne();
        const txList = allProds.filter(p => p.quantity > 0).map(p => ({
          product_id: p._id,
          transaction_type: 'INITIAL_COUNT',
          quantity: p.quantity,
          previous_quantity: 0,
          new_quantity: p.quantity,
          unit_cost: p.cost || 0,
          reference_type: 'Manual',
          reference_number: 'INITIAL-STOCK',
          location_id: mainLocation ? mainLocation._id : null,
          performed_by: adminUser._id,
          notes: 'Initial warehouse inventory stock balance'
        }));
        if (txList.length > 0) {
          await InventoryTransaction.insertMany(txList);
        }
      }

      // Check if notifications exist
      const notifCount = await Notification.countDocuments();
      if (notifCount === 0) {
        await Notification.create([
          {
            title: 'Welcome to Enterprise Inventory Management',
            message: 'Centralized inventory engine, audit ledger, and multi-role operations active.',
            type: 'general',
            severity: 'info',
            target_role: 'all'
          }
        ]);
      }

      // Normalize statuses for existing products, suppliers, categories, customers
      await Product.updateMany({ status: { $in: [null, undefined, 'active'] } }, { $set: { status: 'approved' } });
      await Supplier.updateMany({ status: { $in: [null, undefined] } }, { $set: { status: 'active' } });
      await Category.updateMany({ status: { $in: [null, undefined] } }, { $set: { status: 'active' } });
      await Customer.updateMany({ status: { $in: [null, undefined] } }, { $set: { status: 'active' } });

      // Ensure at least one pending product and one disapproved product exist for testing the approval workflow
      const pendingCount = await Product.countDocuments({ status: 'pending' });
      if (pendingCount === 0) {
        const anySup = await Supplier.findOne();
        await Product.create({
          sku: 'DEMO-PENDING-01',
          name: 'Premium Himalayan Green Tea 250g',
          description: 'Organic handpicked Ilam green tea pending Super Admin quality check',
          category: 'Beverages',
          brand: 'Himalayan Organic',
          unit_of_measure: 'box',
          quantity: 45,
          cost: 250,
          price: 450,
          reorder_level: 10,
          minimum_stock: 5,
          maximum_stock: 100,
          supplier_id: anySup ? anySup._id : null,
          status: 'pending'
        });
      }

      const disapprovedCount = await Product.countDocuments({ status: 'disapproved' });
      if (disapprovedCount === 0) {
        const anySup = await Supplier.findOne();
        const adminUser = await User.findOne({ role: 'super_admin' });
        await Product.create({
          sku: 'DEMO-DISAPP-01',
          name: 'Instant Noodles Reject Pack 500g',
          description: 'Damaged packaging batch rejected upon receiving audit',
          category: 'Packaged Food',
          brand: 'QuickMeal',
          unit_of_measure: 'pack',
          quantity: 12,
          cost: 80,
          price: 120,
          reorder_level: 5,
          minimum_stock: 2,
          maximum_stock: 50,
          supplier_id: anySup ? anySup._id : null,
          status: 'disapproved',
          disapproved_by: adminUser ? adminUser._id : null,
          disapproved_at: new Date(),
          disapproval_reason: 'Packaging damaged and batch expiry date too close (within 15 days)'
        });
      }

      return;
    }

    console.log('Starting comprehensive business database seeding...');

    // 1. Seed Locations
    const mainLocation = await Location.create({
      name: 'Main Central Warehouse',
      code: 'LOC-MAIN',
      address: 'Kathmandu Logistics Hub, Bagmati, Nepal',
      is_default: true,
      status: 'active'
    });
    const storeLocation = await Location.create({
      name: 'Kathmandu Retail Outlet',
      code: 'LOC-KTM-01',
      address: 'New Baneshwor, Kathmandu, Nepal',
      is_default: false,
      status: 'active'
    });
    console.log('Locations seeded');

    // 2. Seed Users across realistic business roles
    const passwordHash = bcrypt.hashSync('admin123', 10);
    const users = [
      {
        username: 'admin',
        email: 'admin@inventory.com',
        password: passwordHash,
        full_name: 'Prakash Sharma (Executive)',
        phone: '+977-9851000001',
        role: 'super_admin',
        status: 'active'
      },
      {
        username: 'inventory_mgr',
        email: 'inventory@inventory.com',
        password: passwordHash,
        full_name: 'Anita Shakya (Stock Controller)',
        phone: '+977-9851000002',
        role: 'inventory_manager',
        status: 'active'
      },
      {
        username: 'sales_rep',
        email: 'sales@inventory.com',
        password: passwordHash,
        full_name: 'Rohan Shrestha (Sales Officer)',
        phone: '+977-9851000003',
        role: 'sales_staff',
        status: 'active'
      },
      {
        username: 'purchase_rep',
        email: 'purchase@inventory.com',
        password: passwordHash,
        full_name: 'Bikash Adhikari (Procurement)',
        phone: '+977-9851000004',
        role: 'purchase_staff',
        status: 'active'
      }
    ];

    const createdUsers = await User.insertMany(users);
    const adminUser = createdUsers[0];
    const inventoryMgr = createdUsers[1];
    const salesRep = createdUsers[2];
    const purchaseRep = createdUsers[3];
    console.log('Commercial users seeded with role hierarchy');

    // 3. Seed Categories
    const categoriesData = [
      { name: 'Household & Cleaning', description: 'Cleaning supplies, sanitizers, and detergents' },
      { name: 'Grocery & Organic Food', description: 'Staple organic grains, dry foods, and coffee' },
      { name: 'Electronics & Lighting', description: 'Modern home electronics, lighting, and audio' },
      { name: 'Outdoor & Travel', description: 'Backpacks, flasks, and hydration bottles' },
      { name: 'Kitchen & Dining', description: 'Eco-friendly boards, tableware, and mugs' },
      { name: 'Fitness & Wellness', description: 'Resistance bands, mats, and fitness accessories' }
    ];
    await Category.insertMany(categoriesData);
    console.log('Categories seeded');

    // 4. Seed Suppliers
    const suppliersData = [
      { name: 'Himalaya Distributors', contact_person: 'Prakash Koirala', email: 'sales@himalayadistributors.com', phone: '+977-1-4230011', address: 'New Baneshwor Road, Kathmandu 44600, Nepal' },
      { name: 'Everest Imports', contact_person: 'Sujata Shrestha', email: 'contact@everestimports.com', phone: '+977-1-5532245', address: 'Jawalakhel, Lalitpur 44700, Nepal' },
      { name: 'Bagmati Supplies', contact_person: 'Kiran Gurung', email: 'support@bagmatisupplies.com', phone: '+977-1-5107789', address: 'Madhyapur Thimi, Bhaktapur 44800, Nepal' },
      { name: 'Terai Agro Traders', contact_person: 'Manisha Yadav', email: 'orders@teraiagro.com', phone: '+977-51-525874', address: 'Birgunj-10, Parsa 44300, Nepal' },
      { name: 'Annapurna Retail Partners', contact_person: 'Rabin Poudel', email: 'info@annapurnaretail.com', phone: '+977-61-541233', address: 'Prithvi Chowk, Pokhara 33700, Nepal' }
    ];
    const createdSuppliers = await Supplier.insertMany(suppliersData);
    console.log('Suppliers seeded');

    // 5. Seed Customers
    const customersData = [
      { name: 'Walk-in Customer', customer_code: 'CUST-WALKIN', customer_type: 'walk_in', phone: '9800000000', email: 'walkin@store.local', address: 'Store Counter' },
      { name: 'Evergreen Supermarket Ltd', customer_code: 'CUST-1001', customer_type: 'wholesale', phone: '+977-1-4412389', email: 'procurement@evergreen.com.np', address: 'Baluwatar, Kathmandu', tax_number: 'PAN-302194821', credit_limit: 500000 },
      { name: 'Sunrise Department Stores', customer_code: 'CUST-1002', customer_type: 'wholesale', phone: '+977-1-5523910', email: 'orders@sunrisestores.com.np', address: 'Kumaripati, Lalitpur', tax_number: 'PAN-601928410', credit_limit: 300000 },
      { name: 'Apex Tech Solutions', customer_code: 'CUST-1003', customer_type: 'corporate', phone: '+977-1-4248811', email: 'admin@apextech.com.np', address: 'Putalisadak, Kathmandu', tax_number: 'PAN-109283746' },
      { name: 'Dr. Sandesh Karki', customer_code: 'CUST-1004', customer_type: 'retail', phone: '+977-9841234567', email: 'sandesh.karki@gmail.com', address: 'Lazimpat, Kathmandu' }
    ];
    const createdCustomers = await Customer.insertMany(customersData);
    console.log('Customers seeded');

    // 6. Seed Products with complete domain attributes
    const productsData = [
      {
        sku: 'SKU-1001',
        name: 'Eco-Friendly Laundry Detergent 2L',
        description: 'Plant-based biodegradable liquid laundry detergent',
        category: 'Household & Cleaning',
        brand: 'CleanEarth',
        unit_of_measure: 'liter',
        quantity: 120,
        reorder_level: 30,
        minimum_stock: 15,
        maximum_stock: 200,
        price: 1250,
        cost: 650,
        supplier_id: createdSuppliers[0]._id,
        location_id: mainLocation._id,
        barcode: '890123456701',
        batch_number: 'B2401',
        expiry_date: new Date('2027-12-31')
      },
      {
        sku: 'SKU-1002',
        name: 'Organic Himalayan Granola 500g',
        description: 'Honey almond clusters with Himalayan roasted oats',
        category: 'Grocery & Organic Food',
        brand: 'Himalayan Harvest',
        unit_of_measure: 'pack',
        quantity: 80,
        reorder_level: 25,
        minimum_stock: 10,
        maximum_stock: 150,
        price: 850,
        cost: 420,
        supplier_id: createdSuppliers[1]._id,
        location_id: mainLocation._id,
        barcode: '890123456702',
        batch_number: 'B2402',
        expiry_date: new Date('2026-06-30')
      },
      {
        sku: 'SKU-1003',
        name: 'Stainless Steel Insulated Bottle 750ml',
        description: 'Double-walled vacuum insulated flask, keeps 24h cold',
        category: 'Outdoor & Travel',
        brand: 'EverTrek',
        unit_of_measure: 'pcs',
        quantity: 18, // LOW STOCK ON PURPOSE
        reorder_level: 20,
        minimum_stock: 10,
        maximum_stock: 100,
        price: 2400,
        cost: 1200,
        supplier_id: createdSuppliers[2]._id,
        location_id: mainLocation._id,
        barcode: '890123456703'
      },
      {
        sku: 'SKU-1004',
        name: 'Smart Eye-Care LED Desk Lamp',
        description: 'Adjustable touch dimmer lamp with USB-C charging port',
        category: 'Electronics & Lighting',
        brand: 'LumaTech',
        unit_of_measure: 'pcs',
        quantity: 4, // CRITICAL STOCK ON PURPOSE
        reorder_level: 15,
        minimum_stock: 5,
        maximum_stock: 80,
        price: 3600,
        cost: 1850,
        supplier_id: createdSuppliers[3]._id,
        location_id: mainLocation._id,
        barcode: '890123456704'
      },
      {
        sku: 'SKU-1005',
        name: 'Wireless ANC Bluetooth Earbuds',
        description: 'Active noise cancellation earbuds with 36h battery life',
        category: 'Electronics & Lighting',
        brand: 'SonicWave',
        unit_of_measure: 'pair',
        quantity: 95,
        reorder_level: 25,
        minimum_stock: 10,
        maximum_stock: 150,
        price: 5800,
        cost: 2900,
        supplier_id: createdSuppliers[4]._id,
        location_id: mainLocation._id,
        barcode: '890123456705'
      },
      {
        sku: 'SKU-1006',
        name: 'Bamboo Chef Cutting Board',
        description: 'Organic antimicrobial reversible cutting board with juice groove',
        category: 'Kitchen & Dining',
        brand: 'GreenKitchen',
        unit_of_measure: 'pcs',
        quantity: 70,
        reorder_level: 18,
        minimum_stock: 10,
        maximum_stock: 120,
        price: 1950,
        cost: 980,
        supplier_id: createdSuppliers[0]._id,
        location_id: mainLocation._id,
        barcode: '890123456706'
      },
      {
        sku: 'SKU-1007',
        name: 'Artisan Dark Roast Arabica Beans 1kg',
        description: 'Freshly roasted single-origin Gulmi highland coffee beans',
        category: 'Grocery & Organic Food',
        brand: 'Nepal Roasters',
        unit_of_measure: 'kg',
        quantity: 110,
        reorder_level: 28,
        minimum_stock: 12,
        maximum_stock: 180,
        price: 1600,
        cost: 750,
        supplier_id: createdSuppliers[1]._id,
        location_id: mainLocation._id,
        barcode: '890123456707'
      },
      {
        sku: 'SKU-1008',
        name: 'All-Weather Expedition Backpack 32L',
        description: 'Waterproof ripstop nylon backpack with laptop compartment',
        category: 'Outdoor & Travel',
        brand: 'EverTrek',
        unit_of_measure: 'pcs',
        quantity: 0, // OUT OF STOCK ON PURPOSE
        reorder_level: 14,
        minimum_stock: 5,
        maximum_stock: 60,
        price: 4500,
        cost: 2100,
        supplier_id: createdSuppliers[2]._id,
        location_id: mainLocation._id,
        barcode: '890123456708'
      },
      {
        sku: 'SKU-1009',
        name: 'Handcrafted Stoneware Coffee Mug Set',
        description: 'Set of 4 matte glazed ceramic mugs',
        category: 'Kitchen & Dining',
        brand: 'PottersClay',
        unit_of_measure: 'box',
        quantity: 90,
        reorder_level: 22,
        minimum_stock: 10,
        maximum_stock: 140,
        price: 1850,
        cost: 870,
        supplier_id: createdSuppliers[3]._id,
        location_id: mainLocation._id,
        barcode: '890123456709'
      },
      {
        sku: 'SKU-1010',
        name: 'Pro Resistance Exercise Bands Set',
        description: '5 levels of natural latex bands with door anchor and handles',
        category: 'Fitness & Wellness',
        brand: 'FitCore',
        unit_of_measure: 'pack',
        quantity: 130,
        reorder_level: 35,
        minimum_stock: 15,
        maximum_stock: 200,
        price: 2200,
        cost: 1050,
        supplier_id: createdSuppliers[4]._id,
        location_id: mainLocation._id,
        barcode: '890123456710'
      }
    ];

    const createdProducts = await Product.insertMany(productsData);
    console.log('Products seeded');

    // 7. Seed Initial Inventory Ledger Transactions
    const initialTransactions = [];
    for (const prod of createdProducts) {
      if (prod.quantity > 0) {
        initialTransactions.push({
          product_id: prod._id,
          transaction_type: 'INITIAL_COUNT',
          quantity: prod.quantity,
          previous_quantity: 0,
          new_quantity: prod.quantity,
          unit_cost: prod.cost,
          reference_type: 'Manual',
          reference_number: 'INITIAL-STOCK',
          location_id: mainLocation._id,
          performed_by: adminUser._id,
          notes: 'Initial warehouse inventory stock balance'
        });
      }
    }
    await InventoryTransaction.insertMany(initialTransactions);
    console.log('Initial inventory ledger transactions seeded');

    // 8. Seed Purchase Orders with realistic workflow states
    const poList = [
      {
        order_number: 'PO-2026-101',
        supplier_id: createdSuppliers[0]._id,
        status: 'received',
        payment_status: 'paid',
        subtotal: 32500,
        total_amount: 32500,
        created_by: purchaseRep._id,
        approved_by: adminUser._id,
        approved_at: new Date('2026-03-01'),
        received_at: new Date('2026-03-05'),
        items: [
          { product_id: createdProducts[0]._id, quantity: 50, received_quantity: 50, unit_price: 650, total_price: 32500 }
        ]
      },
      {
        order_number: 'PO-2026-102',
        supplier_id: createdSuppliers[2]._id,
        status: 'partially_received',
        payment_status: 'partially_paid',
        subtotal: 60000,
        total_amount: 60000,
        created_by: purchaseRep._id,
        approved_by: inventoryMgr._id,
        approved_at: new Date('2026-03-10'),
        items: [
          { product_id: createdProducts[2]._id, quantity: 50, received_quantity: 20, unit_price: 1200, total_price: 60000 }
        ]
      },
      {
        order_number: 'PO-2026-103',
        supplier_id: createdSuppliers[3]._id,
        status: 'submitted',
        payment_status: 'unpaid',
        subtotal: 55500,
        total_amount: 55500,
        created_by: purchaseRep._id,
        items: [
          { product_id: createdProducts[3]._id, quantity: 30, received_quantity: 0, unit_price: 1850, total_price: 55500 }
        ]
      },
      {
        order_number: 'PO-2026-104',
        supplier_id: createdSuppliers[2]._id,
        status: 'approved',
        payment_status: 'unpaid',
        subtotal: 42000,
        total_amount: 42000,
        created_by: purchaseRep._id,
        approved_by: adminUser._id,
        approved_at: new Date('2026-03-25'),
        items: [
          { product_id: createdProducts[7]._id, quantity: 20, received_quantity: 0, unit_price: 2100, total_price: 42000 }
        ]
      }
    ];
    await PurchaseOrder.insertMany(poList);
    console.log('Purchase orders with lifecycle statuses seeded');

    // 9. Seed Sales Orders with real financial calculation (COGS and Profit)
    const salesList = [];
    const salesHistories = [];

    const pastDates = [
      new Date('2026-03-12'),
      new Date('2026-03-15'),
      new Date('2026-03-18'),
      new Date('2026-03-22'),
      new Date('2026-03-26')
    ];

    for (let i = 0; i < 5; i++) {
      const p1 = createdProducts[i % 5];
      const p2 = createdProducts[(i + 3) % 5];
      const q1 = (i + 1) * 2;
      const q2 = 3;

      const cost1 = p1.cost * q1;
      const cost2 = p2.cost * q2;
      const rev1 = p1.price * q1;
      const rev2 = p2.price * q2;

      const subtotal = rev1 + rev2;
      const totalCost = cost1 + cost2;
      const profit = subtotal - totalCost;

      const orderNumber = `SO-2026-${1001 + i}`;
      const customer = createdCustomers[i % createdCustomers.length];

      salesList.push({
        order_number: orderNumber,
        invoice_number: `INV-2026-${5001 + i}`,
        customer_id: customer._id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        status: 'completed',
        stock_deducted: true,
        payment_method: i % 2 === 0 ? 'cash' : 'bank_transfer',
        payment_status: 'paid',
        subtotal,
        total_amount: subtotal,
        total_cost: totalCost,
        gross_profit: profit,
        paid_amount: subtotal,
        created_by: salesRep._id,
        created_at: pastDates[i],
        items: [
          { product_id: p1._id, quantity: q1, unit_price: p1.price, unit_cost: p1.cost, total_price: rev1 },
          { product_id: p2._id, quantity: q2, unit_price: p2.price, unit_cost: p2.cost, total_price: rev2 }
        ]
      });

      salesHistories.push(
        { product_id: p1._id, quantity: q1, sale_date: pastDates[i], unit_price: p1.price },
        { product_id: p2._id, quantity: q2, sale_date: pastDates[i], unit_price: p2.price }
      );
    }

    const createdSales = await SalesOrder.insertMany(salesList);
    await SalesHistory.insertMany(salesHistories);
    console.log('Sales orders with COGS & profit margins seeded');

    // 10. Seed Initial Notifications
    await Notification.create([
      {
        title: 'Critical Out of Stock: SKU-1008',
        message: 'Product "All-Weather Expedition Backpack 32L" is completely out of stock (0 units). Reorder immediately.',
        type: 'out_of_stock',
        severity: 'critical',
        target_role: 'all',
        reference_type: 'Product',
        reference_id: createdProducts[7]._id
      },
      {
        title: 'Low Stock Alert: SKU-1003',
        message: 'Stainless Steel Insulated Bottle quantity (18) is below reorder level (20).',
        type: 'low_stock',
        severity: 'warning',
        target_role: 'inventory_manager',
        reference_type: 'Product',
        reference_id: createdProducts[2]._id
      },
      {
        title: 'Purchase Order Pending Approval: PO-2026-103',
        message: 'PO-2026-103 from Terai Agro Traders awaiting executive approval.',
        type: 'po_pending',
        severity: 'info',
        target_role: 'admin'
      }
    ]);
    console.log('Business notifications seeded');

    console.log('Database seeding successfully finished!');
  } catch (error) {
    console.error('Error seeding database:', error.message);
  }
};

const getDb = () => {
  if (!isConnected) {
    throw new Error('Database not connected');
  }
  return mongoose.connection;
};

module.exports = { initDatabase, getDb };
