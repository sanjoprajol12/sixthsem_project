const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Supplier, Product, PurchaseOrder, SalesOrder } = require('../models');

let isConnected = false;

const initDatabase = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/InventoryDb';

    await mongoose.connect(mongoURI);

    isConnected = true;
    console.log('Connected to MongoDB database');

    // Seed initial data only in development or when explicitly enabled
    const shouldSeed =
      process.env.NODE_ENV === 'development' || process.env.SEED_DB === 'true';

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
      console.log('Database already seeded');
      return;
    }

    // Create default admin user
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@inventory.com',
      password: defaultPassword,
      role: 'admin'
    });

    console.log('Admin user created');

    // Seed Suppliers
    const suppliers = [
      { name: 'Himalaya Distributors', contact_person: 'Prakash Koirala', email: 'sales@himalayadistributors.com', phone: '+977-1-4230011', address: 'New Baneshwor Road, Kathmandu 44600, Nepal' },
      { name: 'Everest Imports', contact_person: 'Sujata Shrestha', email: 'contact@everestimports.com', phone: '+977-1-5532245', address: 'Jawalakhel, Lalitpur 44700, Nepal' },
      { name: 'Bagmati Supplies', contact_person: 'Kiran Gurung', email: 'support@bagmatisupplies.com', phone: '+977-1-5107789', address: 'Madhyapur Thimi, Bhaktapur 44800, Nepal' },
      { name: 'Terai Agro Traders', contact_person: 'Manisha Yadav', email: 'orders@teraiagro.com', phone: '+977-51-525874', address: 'Birgunj-10, Parsa 44300, Nepal' },
      { name: 'Annapurna Retail Partners', contact_person: 'Rabin Poudel', email: 'info@annapurnaretail.com', phone: '+977-61-541233', address: 'Prithvi Chowk, Pokhara 33700, Nepal' },
      { name: 'Lumbini Logistics', contact_person: 'Asmita Chaudhary', email: 'hello@lumbinilogistics.com', phone: '+977-71-520987', address: 'Kalika Nagar, Butwal 32907, Nepal' },
      { name: 'Koseli Trading House', contact_person: 'Bijay Maharjan', email: 'trade@koselitrading.com', phone: '+977-1-4478932', address: 'Kalimati, Kathmandu 44613, Nepal' },
      { name: 'Sagarmatha Industrial', contact_person: 'Nirmala Rai', email: 'service@sagarmathaindustrial.com', phone: '+977-56-590221', address: 'Sahid Chowk, Bharatpur 44200, Nepal' },
      { name: 'Karnali Merchants', contact_person: 'Ramita Bohara', email: 'logistics@karnalimerchants.com', phone: '+977-81-525601', address: 'Birendranagar-5, Surkhet 21700, Nepal' },
      { name: 'Janakpur Wholesalers', contact_person: 'Deepak Jha', email: 'accounts@janakpurwholesale.com', phone: '+977-41-523478', address: 'Ramananda Chowk, Janakpur 45600, Nepal' }
    ];

    const createdSuppliers = await Supplier.insertMany(suppliers);
    console.log('Suppliers seeded');

    // Seed Products
    const products = [
      { sku: 'SKU-1001', name: 'Eco-Friendly Detergent', description: 'Plant-based liquid detergent', category: 'Household', quantity: 120, reorder_level: 30, price: 12.99, cost: 6.5, supplier_id: createdSuppliers[0]._id, barcode: '012345678901' },
      { sku: 'SKU-1002', name: 'Organic Granola', description: 'Honey almond granola clusters', category: 'Grocery', quantity: 80, reorder_level: 20, price: 8.49, cost: 4.1, supplier_id: createdSuppliers[1]._id, barcode: '012345678902' },
      { sku: 'SKU-1003', name: 'Stainless Steel Bottle', description: 'Insulated 750ml water bottle', category: 'Outdoor', quantity: 60, reorder_level: 15, price: 24.99, cost: 12.2, supplier_id: createdSuppliers[2]._id, barcode: '012345678903' },
      { sku: 'SKU-1004', name: 'LED Desk Lamp', description: 'Adjustable brightness lamp', category: 'Electronics', quantity: 45, reorder_level: 12, price: 35.5, cost: 18.0, supplier_id: createdSuppliers[3]._id, barcode: '012345678904' },
      { sku: 'SKU-1005', name: 'Wireless Earbuds', description: 'Noise-cancelling earbuds', category: 'Electronics', quantity: 95, reorder_level: 25, price: 59.99, cost: 28.5, supplier_id: createdSuppliers[4]._id, barcode: '012345678905' },
      { sku: 'SKU-1006', name: 'Bamboo Cutting Board', description: 'Reversible large board', category: 'Kitchen', quantity: 70, reorder_level: 18, price: 19.75, cost: 9.8, supplier_id: createdSuppliers[5]._id, barcode: '012345678906' },
      { sku: 'SKU-1007', name: 'Gourmet Coffee Beans', description: 'Dark roast Arabica beans', category: 'Grocery', quantity: 110, reorder_level: 28, price: 15.75, cost: 7.4, supplier_id: createdSuppliers[6]._id, barcode: '012345678907' },
      { sku: 'SKU-1008', name: 'Travel Backpack', description: 'Water-resistant 30L backpack', category: 'Travel', quantity: 55, reorder_level: 14, price: 42.0, cost: 20.5, supplier_id: createdSuppliers[7]._id, barcode: '012345678908' },
      { sku: 'SKU-1009', name: 'Ceramic Mug Set', description: 'Set of 4 stoneware mugs', category: 'Kitchen', quantity: 90, reorder_level: 22, price: 18.25, cost: 8.6, supplier_id: createdSuppliers[8]._id, barcode: '012345678909' },
      { sku: 'SKU-1010', name: 'Fitness Resistance Bands', description: 'Set of 5 varying resistance bands', category: 'Fitness', quantity: 130, reorder_level: 35, price: 22.5, cost: 10.3, supplier_id: createdSuppliers[9]._id, barcode: '012345678910' }
    ];

    const createdProducts = await Product.insertMany(products);
    console.log('Products seeded');

    // Seed Purchase Orders
    const basePrices = [12.5, 8.75, 15.6, 22.4, 18.95];
    const purchaseOrders = [];
    
    for (let i = 0; i < 10; i++) {
      const items = [];
      for (let j = 0; j < 2; j++) {
        const productId = createdProducts[(i + j) % 10]._id;
        const quantity = (j + 2) * 10;
        const unitPrice = basePrices[(i + j) % basePrices.length];
        const totalPrice = parseFloat((quantity * unitPrice).toFixed(2));
        
        items.push({
          product_id: productId,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice
        });
      }
      
      const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);
      const statuses = ['received', 'pending', 'processing', 'received', 'cancelled', 'received', 'pending', 'processing', 'received', 'pending'];
      
      purchaseOrders.push({
        order_number: `PO-${1001 + i}`,
        supplier_id: createdSuppliers[i]._id,
        status: statuses[i],
        total_amount: parseFloat(totalAmount.toFixed(2)),
        created_by: adminUser._id,
        items
      });
    }

    await PurchaseOrder.insertMany(purchaseOrders);
    console.log('Purchase orders seeded');

    // Seed Sales Orders
    const salesBasePrices = [24.99, 35.5, 15.75, 42.0, 18.25];
    const salesOrders = [];
    
    for (let i = 0; i < 10; i++) {
      const items = [];
      for (let j = 0; j < 2; j++) {
        const productId = createdProducts[(i * 2 + j) % 10]._id;
        const quantity = (j + 1) * 5;
        const unitPrice = salesBasePrices[(i + j) % salesBasePrices.length];
        const totalPrice = parseFloat((quantity * unitPrice).toFixed(2));
        
        items.push({
          product_id: productId,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice
        });
      }
      
      const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);
      const customerNames = [
        'Evergreen Market', 'Sunrise Grocers', 'Metro Retail', 'QuickShop', 'Galaxy Stores',
        'FreshMart', 'Urban Bodega', 'Harbor Foods', 'Northline Retail', 'Central Plaza'
      ];
      const statuses = ['completed', 'completed', 'pending', 'completed', 'shipped', 'completed', 'pending', 'processing', 'completed', 'completed'];
      const amounts = [1240.50, 980.00, 1560.75, 845.20, 1325.00, 960.40, 1105.90, 1495.30, 875.60, 1408.10];
      
      salesOrders.push({
        order_number: `SO-${1001 + i}`,
        customer_name: customerNames[i],
        status: statuses[i],
        total_amount: amounts[i],
        created_by: adminUser._id,
        items
      });
    }

    await SalesOrder.insertMany(salesOrders);
    console.log('Sales orders seeded');
    console.log('Database seeding completed');
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
