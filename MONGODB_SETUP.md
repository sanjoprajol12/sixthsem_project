# MongoDB Setup Guide

This project has been configured to use MongoDB instead of SQLite. Follow these steps to set up your MongoDB database.

## Prerequisites

1. **Install MongoDB**: 
   - For local installation: Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   - Or use MongoDB Atlas (cloud): Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

## Configuration

### Option 1: Local MongoDB

1. Start your local MongoDB server:
   ```bash
   # Windows
   mongod

   # macOS/Linux
   sudo systemctl start mongod
   ```

2. Create a `.env` file in the root directory with:
   ```
   MONGODB_URI=mongodb://localhost:27017/inventory_management
   PORT=5000
   JWT_SECRET=your-secret-key-change-this-in-production
   NODE_ENV=development
   ```

### Option 2: MongoDB Atlas (Cloud)

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get your connection string (it will look like: `mongodb+srv://username:password@cluster.mongodb.net/inventory_management`)
3. Create a `.env` file in the root directory with:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/inventory_management
   PORT=5000
   JWT_SECRET=your-secret-key-change-this-in-production
   NODE_ENV=development
   ```

## Database Structure

The following collections will be automatically created when you start the server:

- **users** - User accounts (admin/staff)
- **suppliers** - Supplier information
- **products** - Product inventory
- **purchaseorders** - Purchase orders
- **salesorders** - Sales orders
- **inventorytransactions** - Inventory transaction history
- **saleshistories** - Sales history for forecasting

## Default Admin Account

When the database is first initialized, a default admin account is created:
- **Username**: admin
- **Email**: admin@inventory.com
- **Password**: admin123

**Important**: Change this password after first login in production!

## Starting the Server

1. Make sure MongoDB is running (local or Atlas)
2. Start the server:
   ```bash
   npm start
   # or for development
   npm run dev
   ```

The server will automatically:
- Connect to MongoDB
- Create the database if it doesn't exist
- Seed initial data (suppliers, products, orders) if the database is empty

## Troubleshooting

### Connection Error
- Verify MongoDB is running: `mongosh` or check MongoDB Compass
- Check your connection string in `.env`
- For Atlas: Ensure your IP is whitelisted in Network Access settings

### Database Not Seeding
- The database only seeds if it's empty (no users exist)
- To re-seed: Drop the database and restart the server

## Models

All Mongoose models are located in `server/models/`:
- `User.js` - User authentication and roles
- `Supplier.js` - Supplier information
- `Product.js` - Product inventory
- `PurchaseOrder.js` - Purchase orders with embedded items
- `SalesOrder.js` - Sales orders with embedded items
- `InventoryTransaction.js` - Transaction history
- `SalesHistory.js` - Sales history for analytics

