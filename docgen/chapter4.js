'use strict';
const {
  AlignmentType, BorderStyle, Paragraph, ShadingType, Table,
  TableCell, TableRow, TextRun, VerticalAlign, WidthType, TableLayoutType
} = require('docx');
const G = require('./generate.js');
const { dtable, tblCap, figCap, chHead, sh, p, cp, lp, bl, bls, tr, tc, trow, tbl, arrowP, diagBox, pt } = G;

// ── CHAPTER 4: SYSTEM DESIGN ──────────────────────────────

// Figure 2: Block Diagram (high-level)
function blockDiagram() {
  const box = (t, fill) => diagBox(t, fill || 'BDD7EE');
  return [
    box('User (Admin / Staff)\nWeb Browser / Mobile Browser', 'D6E4F0'),
    arrowP(),
    box('React.js Frontend (SPA)\n- UI Components\n- Barcode Scanner\n- Charts & Reports', 'BDD7EE'),
    arrowP(),
    box('Node.js + Express.js Backend (REST API)\n- Auth + RBAC\n- CRUD Modules\n- Algorithms\n- Reports', 'FCE4D6'),
    arrowP(),
    box('MongoDB Database\n- Users, Products, Suppliers, Categories\n- Orders + SalesHistory + InventoryTransactions', 'E2EFDA'),
  ];
}

// Figure 3: Waterfall model
function waterfallModel() {
  const step = (name, detail, fill) =>
    tbl([
      trow([tc(name, { fill: fill || '1F3864', bold: true, tc: 'FFFFFF', w: 30 }), tc(detail, { align: AlignmentType.LEFT, w: 70 })]),
    ]);

  return [
    step('Requirements', 'Problem identification, scope definition, TU guidelines, functional & non-functional requirements.', '1F3864'),
    arrowP(),
    step('Analysis', 'Existing system study, feasibility, use cases, DFD, ERD, module breakdown.', '2E74B5'),
    arrowP(),
    step('Design', 'Architecture, database schema, API design, UI wireframes, security design (JWT + roles).', '5B9BD5'),
    arrowP(),
    step('Implementation', 'MERN development: React UI, Express routes, Mongoose models, algorithms and reports.', '70AD47'),
    arrowP(),
    step('Testing', 'Manual UI testing + API testing, boundary tests for algorithms, fix defects.', 'C55A11'),
    arrowP(),
    step('Deployment & Maintenance', 'Run on server + DB, documentation updates, future improvements.', '7F7F7F'),
  ];
}

// Figure 1: System Architecture
function archDiagram() {
  const box = (text, fill, bold) => new Paragraph({
    children: [tr(text, { bold: bold !== false, size: pt(11) })],
    alignment: AlignmentType.CENTER,
    shading: { fill: fill || 'BDD7EE', type: ShadingType.CLEAR, color: 'auto' },
    border: {
      top: { style: BorderStyle.SINGLE, size: 6, color: '2E74B5' },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: '2E74B5' },
      left: { style: BorderStyle.SINGLE, size: 6, color: '2E74B5' },
      right: { style: BorderStyle.SINGLE, size: 6, color: '2E74B5' },
    },
    spacing: { before: 80, after: 80 },
  });

  const arr = () => new Paragraph({
    children: [tr('▼▲', { bold: true, size: pt(14) })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 40 },
  });

  return [
    tbl([
      trow([tc([
        box('PRESENTATION LAYER – FRONTEND', 'D6E4F0'),
        new Paragraph({ children: [tr('React.js 18  |  React Router DOM  |  Axios  |  Recharts  |  HTML5-QRCode', { size: pt(10) })], alignment: AlignmentType.CENTER, spacing: { before: 40, after: 80 } }),
        arr(),
        box('APPLICATION LAYER – BACKEND', 'FCE4D6'),
        new Paragraph({ children: [tr('Node.js + Express.js  |  REST API  |  JWT Middleware  |  express-validator', { size: pt(10) })], alignment: AlignmentType.CENTER, spacing: { before: 40, after: 80 } }),
        arr(),
        box('DATA LAYER – DATABASE', 'E2EFDA'),
        new Paragraph({ children: [tr('MongoDB + Mongoose ODM  |  Collections: Users, Products, Suppliers, Orders, SalesHistory', { size: pt(10) })], alignment: AlignmentType.CENTER, spacing: { before: 40, after: 80 } }),
      ], { fill: 'F8F8F8' })]),
    ]),
  ];
}

// Figure 2: DFD Level 0
function dfd0() {
  return [
    tbl([
      trow([
        tc('ACTOR:\nAdmin / Staff User', { fill: 'D6E4F0', bold: true, align: AlignmentType.CENTER }),
        tc('◄─────────────────────────────────────►', { nob: true }),
        tc('PROCESS:\nInventory Management System', { fill: 'FCE4D6', bold: true, align: AlignmentType.CENTER }),
        tc('◄─────────────────────────────────────►', { nob: true }),
        tc('EXTERNAL:\nMongoDB Database', { fill: 'E2EFDA', bold: true, align: AlignmentType.CENTER }),
      ]),
      trow([
        tc('Inputs:\n- Login credentials\n- Product data\n- Order details\n- Stock updates', { fill: 'EBF3FB', align: AlignmentType.LEFT, fs: pt(10) }),
        tc('', { nob: true }),
        tc('Processes:\n- Authentication\n- Inventory tracking\n- Order management\n- Report generation\n- Algorithm execution', { fill: 'FEF3ED', align: AlignmentType.LEFT, fs: pt(10) }),
        tc('', { nob: true }),
        tc('Outputs:\n- JWT Tokens\n- Reports\n- PO Auto-orders\n- Forecasts\n- Optimizations', { fill: 'EBF7E6', align: AlignmentType.LEFT, fs: pt(10) }),
      ]),
    ]),
  ];
}

// Figure 3: DFD Level 1
function dfd1() {
  const proc = (id, name, fill) => trow([
    tc(id, { fill: fill || 'FCE4D6', bold: true, w: 15 }),
    tc(name, { fill: fill ? fill + '80' : 'FEF3ED', align: AlignmentType.LEFT, w: 85 }),
  ]);
  return [
    tbl([
      trow([tc('Process ID', { fill: '1F3864', bold: true, tc: 'FFFFFF', w: 15 }), tc('Process Description', { fill: '1F3864', bold: true, tc: 'FFFFFF', w: 85 })], true),
      proc('P1', 'User Authentication – Login/Register/Approve/Disable users via JWT tokens'),
      proc('P2', 'Product Management – Create, Read, Update, Delete products with SKU, barcode, category, pricing'),
      proc('P3', 'Supplier Management – Manage supplier contact info and link to products'),
      proc('P4', 'Purchase Order Processing – Create/update POs manually or via auto-reorder algorithm'),
      proc('P5', 'Sales Order Processing – Record customer sales, deduct from stock, log to SalesHistory'),
      proc('P6', 'Report Generation – Stock levels, sales trends, turnover analysis, top-selling, low-stock alerts'),
      proc('P7', 'Auto-Reorder Algorithm – Detect low-stock items, group by supplier, auto-create POs'),
      proc('P8', 'Demand Forecasting – Use SMA on SalesHistory to predict 30/60/90-day demand'),
      proc('P9', 'Inventory Optimization – Classify products by demand pattern and stock health'),
    ]),
    bl(),
    tbl([
      trow([tc('Data Store', { fill: '1F3864', bold: true, tc: 'FFFFFF', w: 25 }), tc('Contents', { fill: '1F3864', bold: true, tc: 'FFFFFF', w: 75 })], true),
      trow([tc('D1 – Users', { fill: 'DAE3F3', bold: true, w: 25 }), tc('User credentials, roles, account status', { w: 75 })]),
      trow([tc('D2 – Products', { fill: 'DAE3F3', bold: true, w: 25 }), tc('SKU, name, quantity, reorder level, price, cost, barcode, supplier reference', { w: 75 })]),
      trow([tc('D3 – Suppliers', { fill: 'DAE3F3', bold: true, w: 25 }), tc('Name, contact person, email, phone, address', { w: 75 })]),
      trow([tc('D4 – Orders', { fill: 'DAE3F3', bold: true, w: 25 }), tc('Purchase Orders and Sales Orders with items, status, amounts', { w: 75 })]),
      trow([tc('D5 – SalesHistory', { fill: 'DAE3F3', bold: true, w: 25 }), tc('Product ID, quantity sold, unit price, sale date — used for forecasting', { w: 75 })]),
    ]),
  ];
}

// Figure 4: ER Diagram
function erDiagram() {
  const entity = (name, fields, fill) => trow([
    tc([
      new Paragraph({ children: [tr(name, { bold: true, size: pt(11), color: 'FFFFFF' })], alignment: AlignmentType.CENTER, shading: { fill: '1F3864', type: ShadingType.CLEAR, color: 'auto' }, spacing: { before: 60, after: 60 } }),
      ...fields.map(f => new Paragraph({ children: [tr(f, { size: pt(10) })], alignment: AlignmentType.LEFT, spacing: { before: 30, after: 30 } })),
    ], { fill: fill || 'EBF3FB' }),
  ]);

  return [
    p('The following entities and their attributes form the database schema:', { firstLine: true }),
    bl(),
    tbl([
      entity('USERS', ['_id (PK)', 'username', 'email', 'password (hashed)', 'role [admin|staff]', 'status [pending|active|disabled]', 'created_at'], 'EBF3FB'),
    ]),
    bl(),
    tbl([
      entity('PRODUCTS', ['_id (PK)', 'sku (unique)', 'name', 'description', 'category', 'quantity', 'reorder_level', 'price', 'cost', 'supplier_id (FK → Suppliers)', 'barcode', 'created_at', 'updated_at'], 'E2EFDA'),
    ]),
    bl(),
    tbl([
      entity('SUPPLIERS', ['_id (PK)', 'name', 'contact_person', 'email', 'phone', 'address', 'created_at'], 'FCE4D6'),
    ]),
    bl(),
    tbl([
      entity('PURCHASEORDERS', ['_id (PK)', 'order_number (unique)', 'supplier_id (FK → Suppliers)', 'status [pending|processing|received|cancelled]', 'total_amount', 'created_by (FK → Users)', 'items: [{product_id, quantity, unit_price, discount, total_price}]', 'created_at', 'updated_at'], 'FFF2CC'),
    ]),
    bl(),
    tbl([
      entity('SALESORDERS', ['_id (PK)', 'order_number (unique)', 'customer_name', 'status [pending|processing|shipped|completed|cancelled]', 'total_amount', 'created_by (FK → Users)', 'items: [{product_id, quantity, unit_price, discount, total_price}]', 'created_at', 'updated_at'], 'F4CCFF'),
    ]),
    bl(),
    tbl([
      entity('SALESHISTORY', ['_id (PK)', 'product_id (FK → Products)', 'quantity', 'unit_price', 'sale_date'], 'FFE0CC'),
    ]),
    bl(),
    p('Relationships Summary:', { bold: true }),
    tbl([
      trow([tc('Relationship', { fill: '1F3864', bold: true, tc: 'FFFFFF' }), tc('Type', { fill: '1F3864', bold: true, tc: 'FFFFFF' }), tc('Description', { fill: '1F3864', bold: true, tc: 'FFFFFF' })], true),
      trow([tc('Products → Suppliers', { fill: 'FFFFFF' }), tc('Many-to-One', { fill: 'FFFFFF' }), tc('Many products can belong to one supplier', { fill: 'FFFFFF', align: AlignmentType.LEFT })]),
      trow([tc('PurchaseOrders → Suppliers', { fill: 'DAE3F3' }), tc('Many-to-One', { fill: 'DAE3F3' }), tc('Many purchase orders can be from one supplier', { fill: 'DAE3F3', align: AlignmentType.LEFT })]),
      trow([tc('PurchaseOrders → Products', { fill: 'FFFFFF' }), tc('Many-to-Many', { fill: 'FFFFFF' }), tc('One PO can contain many products (via items array)', { fill: 'FFFFFF', align: AlignmentType.LEFT })]),
      trow([tc('SalesOrders → Products', { fill: 'DAE3F3' }), tc('Many-to-Many', { fill: 'DAE3F3' }), tc('One Sales Order can contain many products (via items array)', { fill: 'DAE3F3', align: AlignmentType.LEFT })]),
      trow([tc('SalesOrders → Users', { fill: 'FFFFFF' }), tc('Many-to-One', { fill: 'FFFFFF' }), tc('Multiple orders can be created by one user', { fill: 'FFFFFF', align: AlignmentType.LEFT })]),
      trow([tc('SalesHistory → Products', { fill: 'DAE3F3' }), tc('Many-to-One', { fill: 'DAE3F3' }), tc('Multiple sales records reference one product', { fill: 'DAE3F3', align: AlignmentType.LEFT })]),
    ]),
  ];
}

// Figure 5: Use Case
function useCaseDiagram() {
  const cell2 = (t, fill) => tc(t, { fill: fill || 'FFFFFF', align: AlignmentType.CENTER });
  const Y = () => cell2('✔', 'E2EFDA');
  const N = () => cell2('✘', 'FFCCCC');
  return [
    p('The following table represents the Use Case access matrix for the two system actors. This covers all main functions implemented in the backend routes and frontend modules.', { firstLine: true }),
    bl(),
    tbl([
      trow([
        tc('Use Case / Feature', { fill: '1F3864', bold: true, tc: 'FFFFFF', w: 60 }),
        tc('Admin', { fill: '1F3864', bold: true, tc: 'FFFFFF', w: 20 }),
        tc('Staff', { fill: '1F3864', bold: true, tc: 'FFFFFF', w: 20 }),
      ], true),
      trow([tc('Login and Logout', { w: 60 }), Y(), Y()]),
      trow([tc('Register Account (requires admin approval)', { w: 60 }), Y(), Y()]),
      trow([tc('View Dashboard and metrics', { w: 60 }), Y(), Y()]),
      trow([tc('View Products list and search/filter', { w: 60 }), Y(), Y()]),
      trow([tc('Create / Update / Delete Products', { w: 60 }), Y(), N()]),
      trow([tc('Manage Categories (CRUD)', { w: 60 }), Y(), N()]),
      trow([tc('Manage Suppliers (CRUD)', { w: 60 }), Y(), N()]),
      trow([tc('Create Sales Orders', { w: 60 }), Y(), Y()]),
      trow([tc('Update Sales Order Status', { w: 60 }), Y(), N()]),
      trow([tc('Create / Manage Purchase Orders', { w: 60 }), Y(), N()]),
      trow([tc('View Reports and Charts', { w: 60 }), Y(), Y()]),
      trow([tc('Run Auto-Reorder Algorithm', { w: 60 }), Y(), N()]),
      trow([tc('View Demand Forecast', { w: 60 }), Y(), Y()]),
      trow([tc('View Inventory Optimization', { w: 60 }), Y(), Y()]),
      trow([tc('Approve / Disable User Accounts', { w: 60 }), Y(), N()]),
      trow([tc('Change Own Password', { w: 60 }), Y(), Y()]),
      trow([tc('Scan Barcode for Product Lookup', { w: 60 }), Y(), Y()]),
    ]),
  ];
}

// Figure 6: Auto-Reorder Flowchart
function flowchartAutoReorder() {
  const box = (text, fill, bold) => tbl([trow([tc(text, { fill: fill || 'BDD7EE', bold: bold !== false, align: AlignmentType.CENTER, fs: pt(11) })])]);
  const diamond = (text) => tbl([trow([tc(`◆ ${text}`, { fill: 'FFF2CC', bold: true, align: AlignmentType.CENTER, fs: pt(11) })])]);
  const arr = () => cp('▼', { before: 0, after: 0 });

  return [
    box('START', '70AD47', true),
    arr(),
    box('Query products WHERE quantity ≤ reorder_level', 'BDD7EE'),
    arr(),
    diamond('Products found?'),
    arr(),
    p('[NO] → Return: "No products need reordering"', { left: true, italic: true, after: 80 }),
    p('[YES] → Continue', { left: true, italic: true, after: 80 }),
    arr(),
    box('Separate products WITH supplier and WITHOUT supplier'),
    arr(),
    box('Group products by Supplier ID'),
    arr(),
    box('For each Supplier Group:\nreorderQty = max(reorder_level × 2, 20)\norder_number = "PO-AUTO-{timestamp}-{supplierId}"'),
    arr(),
    box('Create PurchaseOrder in MongoDB\n(status: pending)'),
    arr(),
    diamond('All groups processed?'),
    arr(),
    p('[NO] → Loop back to next group', { italic: true, left: true, after: 80 }),
    p('[YES] → Continue', { italic: true, left: true, after: 80 }),
    arr(),
    box('Return: Orders created list + Skipped products list'),
    arr(),
    box('END', 'FF0000', true),
  ];
}

// Figure 7: Demand Forecast Flowchart
function flowchartDemandForecast() {
  const box = (text, fill) => tbl([trow([tc(text, { fill: fill || 'FCE4D6', bold: true, align: AlignmentType.CENTER, fs: pt(11) })])]);
  const diamond = (text) => tbl([trow([tc(`◆ ${text}`, { fill: 'FFF2CC', bold: true, align: AlignmentType.CENTER, fs: pt(11) })])]);
  const arr = () => cp('▼', { before: 0, after: 0 });
  return [
    box('START', '70AD47'),
    arr(),
    box('Receive: product_id, days (default 30)'),
    arr(),
    box('Fetch SalesHistory for product_id\nfor last (days × 2) period'),
    arr(),
    diamond('Sales data found?'),
    arr(),
    p('[NO] → Return: "insufficient_data" forecast (all zeros)', { italic: true, left: true, after: 80 }),
    p('[YES] → Continue', { italic: true, left: true, after: 80 }),
    arr(),
    box('Calculate:\ntotalQty = SUM(quantity)\ndaysCount = number of sales records\navgDailySales = totalQty / daysCount'),
    arr(),
    box('Forecast:\n30-day = ceil(avgDailySales × 30)\n60-day = ceil(avgDailySales × 60)\n90-day = ceil(avgDailySales × 90)'),
    arr(),
    box('Get current stock from Products collection'),
    arr(),
    box('recommendedOrder = max(0, forecast30 – currentStock)\nreorderUrgent = currentStock < forecast30'),
    arr(),
    box('Return: Historical data + Forecasts + Recommendation'),
    arr(),
    box('END', 'FF0000'),
  ];
}

// Figure 8: Inventory Optimization Flowchart
function flowchartOptimization() {
  const box = (text, fill) => tbl([trow([tc(text, { fill: fill || 'E2EFDA', bold: true, align: AlignmentType.CENTER, fs: pt(11) })])]);
  const diamond = (text) => tbl([trow([tc(`◆ ${text}`, { fill: 'FFF2CC', bold: true, align: AlignmentType.CENTER, fs: pt(11) })])]);
  const arr = () => cp('▼', { before: 0, after: 0 });
  return [
    box('START', '70AD47'),
    arr(),
    box('Fetch ALL products from MongoDB\n(in parallel with SalesHistory aggregation)'),
    arr(),
    box('For each Product:\ncalculate avgDailySales from sales within window'),
    arr(),
    diamond('avgDailySales == 0?'),
    arr(),
    p('[YES] → demandClass = "no_demand"', { italic: true, left: true, after: 40 }),
    p('[< 0.5] → demandClass = "slow_moving"', { italic: true, left: true, after: 40 }),
    p('[0.5–2.0] → demandClass = "normal"', { italic: true, left: true, after: 40 }),
    p('[> 2.0] → demandClass = "fast_moving"', { italic: true, left: true, after: 80 }),
    arr(),
    box('safetyFactor = 7 (fast) | 5 (normal) | 3 (slow)\nsuggestedReorderLevel = max(5, avgDailySales × safetyFactor)'),
    arr(),
    box('daysOfCover = currentQty / avgDailySales'),
    arr(),
    diamond('daysOfCover?'),
    p('[< 3 days] → stockClass = "understocked"', { italic: true, left: true, after: 40 }),
    p('[> 60 days] → stockClass = "overstocked"', { italic: true, left: true, after: 40 }),
    p('[Otherwise] → stockClass = "balanced"', { italic: true, left: true, after: 80 }),
    arr(),
    box('Build result with:\nsku, name, current_stock, avg_daily_sales,\ndays_of_cover, demand_classification, stock_classification'),
    arr(),
    box('Return summary + per-product recommendations'),
    arr(),
    box('END', 'FF0000'),
  ];
}

// Database design tables
function dbDesign() {
  return [
    sh('4.7 Database Design'),
    p('The system uses MongoDB with Mongoose ODM. Below are the detailed field descriptions for each collection:', { firstLine: true }),
    bl(),
    p('4.7.1 Users Collection', { bold: true }),
    bl(),
    tblCap('Users Collection – Field Description'),
    dtable(['Field', 'Data Type', 'Constraints', 'Description'], [
      ['_id', 'ObjectId', 'Auto-generated', 'Primary key'],
      ['username', 'String', 'Required, Unique, Trimmed', 'Login username'],
      ['email', 'String', 'Required, Unique, Lowercase', 'User email address'],
      ['password', 'String', 'Required', 'bcrypt hashed password (salt rounds: 10)'],
      ['role', 'String', 'Enum: admin|staff, Default: staff', 'User role for access control'],
      ['status', 'String', 'Enum: pending|active|disabled, Default: pending', 'Account activation status'],
      ['created_at', 'Date', 'Default: Date.now', 'Account creation timestamp'],
    ], [15, 15, 30, 40]),
    bl(),
    p('4.7.2 Products Collection', { bold: true }),
    bl(),
    tblCap('Products Collection – Field Description'),
    dtable(['Field', 'Data Type', 'Constraints', 'Description'], [
      ['_id', 'ObjectId', 'Auto-generated', 'Primary key'],
      ['sku', 'String', 'Required, Unique', 'Stock Keeping Unit identifier'],
      ['name', 'String', 'Required', 'Product display name'],
      ['description', 'String', 'Optional', 'Product description'],
      ['category', 'String', 'Optional', 'Product category name'],
      ['quantity', 'Number', 'Required, min: 0, Default: 0', 'Current stock quantity'],
      ['reorder_level', 'Number', 'Required, min: 0, Default: 10', 'Trigger level for reorder'],
      ['price', 'Number', 'Required, min: 0', 'Selling price per unit'],
      ['cost', 'Number', 'Required, min: 0', 'Purchase cost per unit'],
      ['supplier_id', 'ObjectId', 'Ref: Supplier', 'Linked supplier record'],
      ['barcode', 'String', 'Optional', 'Barcode value for scanning'],
      ['created_at', 'Date', 'Default: Date.now', 'Record creation timestamp'],
      ['updated_at', 'Date', 'Auto-updated', 'Last modification timestamp'],
    ], [15, 15, 30, 40]),
    bl(),
    p('4.7.3 Suppliers Collection', { bold: true }),
    bl(),
    tblCap('Suppliers Collection – Field Description'),
    dtable(['Field', 'Data Type', 'Constraints', 'Description'], [
      ['_id', 'ObjectId', 'Auto-generated', 'Primary key'],
      ['name', 'String', 'Required', 'Supplier company name'],
      ['contact_person', 'String', 'Optional', 'Primary contact name'],
      ['email', 'String', 'Optional, Lowercase', 'Contact email address'],
      ['phone', 'String', 'Optional', 'Contact phone number'],
      ['address', 'String', 'Optional', 'Physical address'],
      ['created_at', 'Date', 'Default: Date.now', 'Record creation timestamp'],
    ], [15, 15, 30, 40]),
    bl(),
    p('4.7.4 PurchaseOrders Collection', { bold: true }),
    bl(),
    tblCap('PurchaseOrders Collection – Field Description'),
    dtable(['Field', 'Data Type', 'Constraints', 'Description'], [
      ['_id', 'ObjectId', 'Auto-generated', 'Primary key'],
      ['order_number', 'String', 'Required, Unique', 'e.g., PO-001 or PO-AUTO-{ts}-{id}'],
      ['supplier_id', 'ObjectId', 'Ref: Supplier, Required', 'Supplying vendor reference'],
      ['status', 'String', 'Enum: pending|processing|received|cancelled', 'Current order status'],
      ['total_amount', 'Number', 'Required, min: 0', 'Total order value in NPR'],
      ['created_by', 'ObjectId', 'Ref: User, Required', 'User who created the order'],
      ['items', 'Array', 'Sub-documents', 'List of ordered items'],
      ['updated_at', 'Date', 'Auto-updated', 'Last modification timestamp'],
    ], [15, 15, 30, 40]),
    bl(),
    p('4.7.5 SalesOrders Collection', { bold: true }),
    bl(),
    tblCap('SalesOrders Collection – Field Description'),
    dtable(['Field', 'Data Type', 'Constraints', 'Description'], [
      ['_id', 'ObjectId', 'Auto-generated', 'Primary key'],
      ['order_number', 'String', 'Required, Unique', 'Unique sales order number'],
      ['customer_name', 'String', 'Optional', 'Buyer/customer name'],
      ['status', 'String', 'Enum: pending|processing|shipped|completed|cancelled', 'Order lifecycle status'],
      ['total_amount', 'Number', 'Required, min: 0', 'Total bill amount'],
      ['created_by', 'ObjectId', 'Ref: User, Required', 'Staff/Admin who created it'],
      ['items', 'Array', 'Sub-documents', 'Products included in the sale'],
      ['updated_at', 'Date', 'Auto-updated', 'Last modification timestamp'],
    ], [15, 15, 30, 40]),
    bl(),
    p('4.7.6 SalesHistory Collection', { bold: true }),
    bl(),
    tblCap('SalesHistory Collection – Field Description'),
    dtable(['Field', 'Data Type', 'Constraints', 'Description'], [
      ['_id', 'ObjectId', 'Auto-generated', 'Primary key'],
      ['product_id', 'ObjectId', 'Ref: Product, Required', 'Referenced product'],
      ['quantity', 'Number', 'Required, min: 1', 'Quantity sold'],
      ['sale_date', 'Date', 'Default: Date.now', 'Sale timestamp'],
      ['unit_price', 'Number', 'Required, min: 0', 'Unit selling price'],
      ['sales_order_id', 'ObjectId', 'Ref: SalesOrder, Optional', 'Back-reference to sales order'],
    ], [15, 15, 30, 40]),
    bl(),
    p('4.7.7 InventoryTransactions Collection', { bold: true }),
    bl(),
    tblCap('InventoryTransactions Collection – Field Description'),
    dtable(['Field', 'Data Type', 'Constraints', 'Description'], [
      ['_id', 'ObjectId', 'Auto-generated', 'Primary key'],
      ['product_id', 'ObjectId', 'Ref: Product, Required', 'Referenced product'],
      ['transaction_type', 'String', 'Enum: purchase|sale|adjustment', 'Transaction category'],
      ['quantity', 'Number', 'Required', 'Quantity moved (+/- depending on type)'],
      ['unit_cost', 'Number', 'Required, min: 0', 'Cost per unit at transaction time'],
      ['order_id', 'ObjectId', 'Optional', 'Related purchase/sales order id'],
      ['created_at', 'Date', 'Default: Date.now', 'Transaction timestamp'],
    ], [15, 15, 30, 40]),
    bl(),
    p('4.7.8 Categories Collection', { bold: true }),
    bl(),
    tblCap('Categories Collection – Field Description'),
    dtable(['Field', 'Data Type', 'Constraints', 'Description'], [
      ['_id', 'ObjectId', 'Auto-generated', 'Primary key'],
      ['name', 'String', 'Required, Unique', 'Category name'],
      ['description', 'String', 'Optional', 'Category description'],
      ['created_at', 'Date', 'Default: Date.now', 'Record creation timestamp'],
      ['updated_at', 'Date', 'Auto-updated', 'Last modification timestamp'],
    ], [15, 15, 30, 40]),
  ];
}

// Additional TU diagrams (UML + component/deployment) in simple, printable form
function umlDiagrams() {
  const box = (t, fill) => diagBox(t, fill || 'DAE3F3');
  const arrow = () => cp('↓', { before: 0, after: 0 });

  return [
    sh('4.8 UML Diagrams'),
    p('The following UML diagrams are provided in a simplified, report-friendly form to explain core structure and interactions of the system.', { firstLine: true }),
    bl(),

    p('4.8.1 UML Class Diagram (High-Level)', { bold: true }),
    bl(),
    box('User\n- username\n- email\n- password\n- role\n- status', 'BDD7EE'),
    arrow(),
    box('Product\n- sku\n- name\n- category\n- quantity\n- reorder_level\n- price\n- cost\n- supplier_id\n- barcode', 'E2EFDA'),
    arrow(),
    box('Supplier\n- name\n- email\n- phone\n- address', 'FCE4D6'),
    arrow(),
    box('PurchaseOrder\n- order_number\n- supplier_id\n- created_by\n- status\n- items[]\n- total_amount', 'FFF2CC'),
    arrow(),
    box('SalesOrder\n- order_number\n- customer_name\n- created_by\n- status\n- items[]\n- total_amount', 'F4CCFF'),
    arrow(),
    box('SalesHistory\n- product_id\n- quantity\n- unit_price\n- sale_date\n- sales_order_id', 'FFE0CC'),
    figCap('UML Class Diagram (High-Level)'),

    bl(),
    p('4.8.2 UML Sequence Diagram (Sales Order Creation)', { bold: true }),
    bl(),
    tbl([
      trow([tc('Actor', { fill: '1F3864', bold: true, tc: 'FFFFFF', w: 25 }), tc('System Interaction (Sequence)', { fill: '1F3864', bold: true, tc: 'FFFFFF', w: 75 })], true),
      trow([tc('Staff/Admin', { fill: 'DAE3F3', bold: true, w: 25 }), tc('1) Login → receives JWT\n2) Create Sales Order (items)\n3) Backend validates stock\n4) Backend creates SalesOrder\n5) Backend decrements Product.quantity\n6) Backend inserts SalesHistory records\n7) UI shows success + updated stock', { align: AlignmentType.LEFT, w: 75 })]),
    ]),
    figCap('UML Sequence Diagram (Sales Order Creation)'),

    bl(),
    p('4.8.3 UML Activity Diagram (Purchase Order Receiving)', { bold: true }),
    bl(),
    tbl([
      trow([tc('Flow', { fill: '1F3864', bold: true, tc: 'FFFFFF', w: 100 })], true),
      trow([tc('Start → Admin selects PO → Update status to "received" → For each PO item: increment Product.quantity → Insert InventoryTransaction(purchase) → Save PO → End', { align: AlignmentType.LEFT })]),
    ]),
    figCap('UML Activity Diagram (Purchase Order Receiving)'),
  ];
}

function componentDiagram() {
  return [
    sh('4.9 Component Diagram'),
    bl(),
    tbl([
      trow([tc('Client (React.js SPA)', { fill: 'D6E4F0', bold: true })]),
      trow([tc('Components: Auth, Dashboard, Products, Suppliers, Categories, PurchaseOrders, SalesOrders, Reports, Algorithms, Users', { align: AlignmentType.LEFT })]),
    ]),
    arrowP(),
    tbl([
      trow([tc('Server (Node.js + Express.js API)', { fill: 'FCE4D6', bold: true })]),
      trow([tc('Modules: auth, users, products, suppliers, categories, purchase-orders, sales-orders, reports, algorithms', { align: AlignmentType.LEFT })]),
      trow([tc('Middleware: authenticateToken, requireAdmin', { align: AlignmentType.LEFT })]),
    ]),
    arrowP(),
    tbl([
      trow([tc('Database (MongoDB + Mongoose)', { fill: 'E2EFDA', bold: true })]),
      trow([tc('Collections: users, products, suppliers, categories, purchaseorders, salesorders, saleshistories, inventorytransactions', { align: AlignmentType.LEFT })]),
    ]),
  ];
}

function deploymentDiagram() {
  return [
    sh('4.10 Deployment Diagram'),
    bl(),
    tbl([
      trow([tc('User Device (Browser)', { fill: 'D6E4F0', bold: true })]),
      trow([tc('Runs React build (client) + accesses camera for barcode scanning', { align: AlignmentType.LEFT })]),
    ]),
    arrowP(),
    tbl([
      trow([tc('Web/API Server (Node.js Runtime)', { fill: 'FCE4D6', bold: true })]),
      trow([tc('Express.js REST API, JWT validation, business logic, reports, algorithms', { align: AlignmentType.LEFT })]),
    ]),
    arrowP(),
    tbl([
      trow([tc('Database Server (MongoDB)', { fill: 'E2EFDA', bold: true })]),
      trow([tc('Stores all collections and historical sales for analytics', { align: AlignmentType.LEFT })]),
    ]),
  ];
}

function ganttAndSchedule() {
  const header = ['Task / Phase', 'Dec 26–Jan 08', 'Jan 09–Jan 22', 'Jan 23–Feb 05', 'Feb 06–Feb 19', 'Feb 20–Mar 05', 'Mar 06–Mar 26'];
  const bar = (...cells) => cells;
  const X = '■■■';
  const M = '■■';
  const S = '■';
  const E = '';

  return [
    sh('4.11 Gantt Chart and Time Schedule'),
    p('The following 3-month schedule shows the approximate timeline of the project work up to today (2026-03-26).', { firstLine: true }),
    bl(),
    tbl([
      trow(header.map((h, i) => tc(h, { fill: '1F3864', bold: true, tc: 'FFFFFF', w: i === 0 ? 28 : 12 })), true),
      trow(bar(tc('Topic selection & proposal', { align: AlignmentType.LEFT, fill: 'FFFFFF' }), tc(X), tc(M), tc(E), tc(E), tc(E), tc(E))),
      trow(bar(tc('Requirement gathering & analysis', { align: AlignmentType.LEFT, fill: 'DAE3F3' }), tc(M, { fill: 'DAE3F3' }), tc(X, { fill: 'DAE3F3' }), tc(S, { fill: 'DAE3F3' }), tc(E, { fill: 'DAE3F3' }), tc(E, { fill: 'DAE3F3' }), tc(E, { fill: 'DAE3F3' }))),
      trow(bar(tc('Database & API design', { align: AlignmentType.LEFT, fill: 'FFFFFF' }), tc(E), tc(M), tc(X), tc(S), tc(E), tc(E))),
      trow(bar(tc('Frontend UI development', { align: AlignmentType.LEFT, fill: 'DAE3F3' }), tc(E, { fill: 'DAE3F3' }), tc(S, { fill: 'DAE3F3' }), tc(M, { fill: 'DAE3F3' }), tc(X, { fill: 'DAE3F3' }), tc(M, { fill: 'DAE3F3' }), tc(S, { fill: 'DAE3F3' }))),
      trow(bar(tc('Backend development', { align: AlignmentType.LEFT, fill: 'FFFFFF' }), tc(E), tc(S), tc(M), tc(X), tc(M), tc(S))),
      trow(bar(tc('Algorithms + Reports', { align: AlignmentType.LEFT, fill: 'DAE3F3' }), tc(E, { fill: 'DAE3F3' }), tc(E, { fill: 'DAE3F3' }), tc(S, { fill: 'DAE3F3' }), tc(M, { fill: 'DAE3F3' }), tc(X, { fill: 'DAE3F3' }), tc(M, { fill: 'DAE3F3' }))),
      trow(bar(tc('Testing & bug fixing', { align: AlignmentType.LEFT, fill: 'FFFFFF' }), tc(E), tc(E), tc(E), tc(S), tc(M), tc(X))),
      trow(bar(tc('Documentation & diagrams', { align: AlignmentType.LEFT, fill: 'DAE3F3' }), tc(S, { fill: 'DAE3F3' }), tc(S, { fill: 'DAE3F3' }), tc(M, { fill: 'DAE3F3' }), tc(M, { fill: 'DAE3F3' }), tc(M, { fill: 'DAE3F3' }), tc(X, { fill: 'DAE3F3' }))),
    ]),
    figCap('Gantt Chart (3 Months)'),
    bl(),
    tblCap('Time Schedule (3 Months)'),
    dtable(
      ['SN', 'Activity', 'Start Date', 'End Date', 'Deliverable'],
      [
        ['1', 'Topic selection + proposal', '2025-12-26', '2026-01-08', 'Approved topic & objectives'],
        ['2', 'Requirement gathering + analysis', '2026-01-01', '2026-01-25', 'SRS + feasibility + use cases'],
        ['3', 'System + database design', '2026-01-15', '2026-02-10', 'ERD + DFD + schema + architecture'],
        ['4', 'Backend implementation', '2026-01-25', '2026-03-05', 'REST API + models + auth + reports'],
        ['5', 'Frontend implementation', '2026-02-01', '2026-03-15', 'React modules + barcode + charts'],
        ['6', 'Algorithms module', '2026-02-15', '2026-03-15', 'Auto reorder + forecast + optimization'],
        ['7', 'Testing and bug fixing', '2026-03-01', '2026-03-24', 'Test cases + fixes'],
        ['8', 'Final documentation', '2026-03-10', '2026-03-26', 'Final report + diagrams'],
      ],
      [6, 28, 16, 16, 34]
    ),
  ];
}

function chapter4() {
  return [
    chHead('CHAPTER 4: SYSTEM DESIGN'),
    sh('4.1 System Architecture Diagram'),
    p('The system follows a 3-Tier Client-Server Architecture. The Presentation Layer (React.js frontend) communicates with the Application Layer (Node.js/Express.js REST API) over HTTP. The Application Layer interacts with the Data Layer (MongoDB via Mongoose) for all data persistence.', { firstLine: true }),
    bl(),
    ...archDiagram(),
    figCap('System Architecture Diagram (3-Tier)'),

    sh('4.1.1 Block Diagram'),
    p('The block diagram summarizes the end-to-end flow from users to application layers and the database.', { firstLine: true }),
    bl(),
    ...blockDiagram(),
    figCap('Block Diagram (High-Level)'),

    sh('4.1.2 Waterfall Model'),
    p('The project development followed a structured Waterfall model suitable for academic reporting and phased delivery.', { firstLine: true }),
    bl(),
    ...waterfallModel(),
    figCap('Waterfall Model'),

    sh('4.2 Data Flow Diagram – Level 0 (Context Diagram)'),
    p('The Level 0 DFD (Context Diagram) shows the Inventory Management System as a single process interacting with external actors and data stores. It provides a high-level overview of data flowing into and out of the system.', { firstLine: true }),
    bl(),
    ...dfd0(),
    figCap('Data Flow Diagram – Level 0 (Context Diagram)'),

    sh('4.3 Data Flow Diagram – Level 1'),
    p('The Level 1 DFD decomposes the main system into its nine core processes and five primary data stores:', { firstLine: true }),
    bl(),
    ...dfd1(),
    figCap('Data Flow Diagram – Level 1'),

    sh('4.4 Entity Relationship (ER) Diagram'),
    p('The ER Diagram shows all database entities, their attributes, and the relationships between them. The system uses MongoDB (NoSQL), so relationships are implemented through ObjectId references (equivalent to foreign keys).', { firstLine: true }),
    bl(),
    ...erDiagram(),
    figCap('Entity Relationship (ER) Diagram'),

    sh('4.5 Use Case Diagram'),
    p('The system has two primary actors: Admin (full access) and Staff (limited access). The following table represents the Use Case access matrix:', { firstLine: true }),
    bl(),
    ...useCaseDiagram(),
    figCap('Use Case Diagram – Role Access Matrix'),

    sh('4.6 Algorithm Flowcharts'),
    p('4.6.1 Flowchart: Automated Reordering Algorithm', { bold: true }),
    bl(),
    ...flowchartAutoReorder(),
    figCap('Flowchart: Automated Reordering Algorithm'),

    bl(),
    p('4.6.2 Flowchart: Demand Forecasting Algorithm', { bold: true }),
    bl(),
    ...flowchartDemandForecast(),
    figCap('Flowchart: Demand Forecasting Algorithm (Simple Moving Average)'),

    bl(),
    p('4.6.3 Flowchart: Inventory Optimization Algorithm', { bold: true }),
    bl(),
    ...flowchartOptimization(),
    figCap('Flowchart: Inventory Optimization Algorithm'),

    ...dbDesign(),

    ...umlDiagrams(),

    ...componentDiagram(),
    figCap('Component Diagram'),

    ...deploymentDiagram(),
    figCap('Deployment Diagram'),

    ...ganttAndSchedule(),
  ];
}

module.exports = { chapter4 };
