# Postman API Testing Guide

## Quick Start

1. **Import the Collection**
   - Open Postman
   - Click "Import" button
   - Select the `Postman_Collection.json` file
   - The collection will be imported with all endpoints

2. **Set Up Authentication**
   - First, run the "Login" request under Authentication folder
   - The token will be automatically saved to collection variable `auth_token`
   - All subsequent requests will use this token automatically

## Base URL

```
http://localhost:5000
```

Make sure your backend server is running on port 5000.

## Authentication

### Step 1: Login
**POST** `/api/auth/login`

Request Body:
```json
{
    "username": "admin",
    "password": "admin123"
}
```

Response will include a `token` that is automatically saved.

### Step 2: Using the Token
The collection is configured to automatically use the Bearer token for all authenticated requests. The token is stored in the collection variable `auth_token`.

## API Endpoints

### Authentication Endpoints

#### Register User
- **POST** `/api/auth/register`
- Body: `{ "username", "email", "password", "role" }`

#### Login
- **POST** `/api/auth/login`
- Body: `{ "username", "password" }`
- **Automatically saves token**

#### Get Current User
- **GET** `/api/auth/me`
- Requires: Bearer Token

---

### Product Endpoints

#### Get All Products
- **GET** `/api/products`
- Query Parameters (optional):
  - `search` - Search term
  - `category` - Filter by category
  - `supplier` - Filter by supplier ID
  - `minStock` - Minimum stock level
  - `maxStock` - Maximum stock level

#### Get Product by ID
- **GET** `/api/products/:id`

#### Get Product by Barcode
- **GET** `/api/products/barcode/:barcode`

#### Create Product (Admin Only)
- **POST** `/api/products`
- Body:
```json
{
    "sku": "PROD-001",
    "name": "Product Name",
    "description": "Description",
    "category": "Category",
    "quantity": 100,
    "reorder_level": 20,
    "price": 29.99,
    "cost": 15.00,
    "supplier_id": 1,
    "barcode": "123456789"
}
```

#### Update Product (Admin Only)
- **PUT** `/api/products/:id`
- Body: Same as create (all fields)

#### Delete Product (Admin Only)
- **DELETE** `/api/products/:id`

---

### Supplier Endpoints

#### Get All Suppliers
- **GET** `/api/suppliers`

#### Get Supplier by ID
- **GET** `/api/suppliers/:id`

#### Create Supplier
- **POST** `/api/suppliers`
- Body:
```json
{
    "name": "Supplier Name",
    "contact_person": "Contact Name",
    "email": "email@example.com",
    "phone": "+1-555-0123",
    "address": "Address"
}
```

#### Update Supplier
- **PUT** `/api/suppliers/:id`
- Body: Same as create

#### Delete Supplier
- **DELETE** `/api/suppliers/:id`

---

### Purchase Order Endpoints

#### Get All Purchase Orders
- **GET** `/api/purchase-orders`

#### Get Purchase Order by ID
- **GET** `/api/purchase-orders/:id`

#### Create Purchase Order
- **POST** `/api/purchase-orders`
- Body:
```json
{
    "supplier_id": 1,
    "items": [
        {
            "product_id": 1,
            "quantity": 50,
            "unit_price": 15.00
        }
    ]
}
```

#### Update Purchase Order Status
- **PUT** `/api/purchase-orders/:id/status`
- Body:
```json
{
    "status": "received"
}
```
- Status options: `pending`, `received`, `cancelled`

---

### Sales Order Endpoints

#### Get All Sales Orders
- **GET** `/api/sales-orders`

#### Get Sales Order by ID
- **GET** `/api/sales-orders/:id`

#### Create Sales Order
- **POST** `/api/sales-orders`
- Body:
```json
{
    "customer_name": "Customer Name",
    "items": [
        {
            "product_id": 1,
            "quantity": 5,
            "unit_price": 29.99
        }
    ]
}
```

#### Update Sales Order Status
- **PUT** `/api/sales-orders/:id/status`
- Body:
```json
{
    "status": "completed"
}
```
- Status options: `pending`, `completed`, `cancelled`

---

### Report Endpoints

#### Stock Levels Report
- **GET** `/api/reports/stock-levels`

#### Sales Trends Report
- **GET** `/api/reports/sales-trends?days=30`
- Query Parameter: `days` (default: 30)

#### Inventory Turnover Report
- **GET** `/api/reports/inventory-turnover`

#### Low Stock Alerts
- **GET** `/api/reports/low-stock-alerts`

#### Top Selling Products
- **GET** `/api/reports/top-selling?days=30&limit=10`
- Query Parameters:
  - `days` - Number of days (default: 30)
  - `limit` - Number of results (default: 10)

---

### Algorithm Endpoints

#### Auto Reorder
- **POST** `/api/algorithms/auto-reorder`
- Automatically generates purchase orders for low stock items

#### Demand Forecast
- **GET** `/api/algorithms/demand-forecast/:productId?days=30`
- Query Parameter: `days` (default: 30)

#### Inventory Valuation
- **GET** `/api/algorithms/inventory-valuation/:productId?method=weighted_average`
- Query Parameter: `method` (options: `fifo`, `lifo`, `weighted_average`)

#### Inventory Optimization
- **GET** `/api/algorithms/optimize-inventory?days=90`
- Query Parameter: `days` (default: 90)

#### Algorithms Summary
- **GET** `/api/algorithms/summary`
- Get overview of all algorithms status

---

## Testing Workflow

### Recommended Testing Order:

1. **Login** - Get authentication token
2. **Create Supplier** - Create a supplier first
3. **Create Product** - Create products (requires supplier)
4. **Create Purchase Order** - Add inventory
5. **Update Purchase Order Status** - Mark as received (updates inventory)
6. **Create Sales Order** - Sell products
7. **View Reports** - Check analytics
8. **Run Algorithms** - Test advanced features

## Example Test Scenarios

### Scenario 1: Complete Inventory Flow

1. Login as admin
2. Create a supplier
3. Create products with the supplier
4. Create a purchase order to add stock
5. Mark purchase order as received
6. Create a sales order
7. Check reports

### Scenario 2: Low Stock Alert

1. Create product with low quantity (below reorder level)
2. Run Auto Reorder algorithm
3. Check generated purchase orders
4. View Low Stock Alerts report

### Scenario 3: Analytics

1. Create multiple sales orders
2. View Sales Trends report
3. View Top Selling Products
4. Run Demand Forecast for a product
5. Run Inventory Optimization

## Troubleshooting

### 401 Unauthorized
- Make sure you've logged in first
- Check that the token is being sent in the Authorization header
- Token might have expired (login again)

### 403 Forbidden
- Some endpoints require admin role
- Make sure you're logged in as admin (username: admin)

### 404 Not Found
- Check that the server is running on port 5000
- Verify the endpoint URL is correct
- Check that the resource ID exists

### 400 Bad Request
- Check the request body format
- Verify all required fields are provided
- Check data types match expected format

## Environment Variables

The collection uses these variables:
- `base_url` - Set to `http://localhost:5000`
- `auth_token` - Automatically set after login

You can modify these in Postman:
1. Click on the collection name
2. Go to "Variables" tab
3. Edit as needed

