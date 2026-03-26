'use strict';
const {
  AlignmentType, BorderStyle, Document, Footer, Packer, PageNumber,
  Paragraph, ShadingType, Table, TableCell, TableRow, TextRun,
  VerticalAlign, WidthType, convertInchesToTwip, TableLayoutType
} = require('docx');
const fs = require('fs');
const path = require('path');
const G = require('./generate.js');
const { coverPage, certificate, declaration, acknowledgement, abstract,
  dtable, tblCap, figCap, chHead, sh, p, cp, lp, bl, bls, tr, tc, trow,
  tbl, arrowP, diagBox, pt } = G;

// ── TABLE OF CONTENTS ─────────────────────────────────────
function toc() {
  const row = (sec, title, pg) => [sec, title, pg];
  return [
    chHead('TABLE OF CONTENTS'),
    bl(),
    dtable(['Section', 'Title', 'Page No.'], [
      row('', 'Supervisor\'s Certificate', 'ii'),
      row('', 'Declaration', 'iii'),
      row('', 'Acknowledgement', 'iv'),
      row('', 'Abstract', 'v'),
      row('', 'Table of Contents', 'vi'),
      row('', 'List of Figures', 'vii'),
      row('', 'List of Tables', 'viii'),
      row('Chapter 1', 'Introduction', '1'),
      row('1.1', 'Background', '1'),
      row('1.2', 'Problem Statement', '2'),
      row('1.3', 'Objectives', '2'),
      row('1.4', 'Scope of the Project', '3'),
      row('1.5', 'Report Organization', '3'),
      row('Chapter 2', 'Background Study', '4'),
      row('2.1', 'Inventory Management Systems Overview', '4'),
      row('2.2', 'Related Systems and Literature Review', '4'),
      row('2.3', 'Development Technologies', '5'),
      row('Chapter 3', 'System Analysis', '7'),
      row('3.1', 'Analysis of Existing System', '7'),
      row('3.2', 'Drawbacks of Existing System', '7'),
      row('3.3', 'Proposed System', '8'),
      row('3.4', 'Feasibility Study', '8'),
      row('3.5', 'System Requirements', '9'),
      row('Chapter 4', 'System Design', '11'),
      row('4.1', 'System Architecture Diagram', '11'),
      row('4.1.1', 'Block Diagram', '11'),
      row('4.1.2', 'Waterfall Model', '12'),
      row('4.2', 'Data Flow Diagram (Level 0)', '12'),
      row('4.3', 'Data Flow Diagram (Level 1)', '13'),
      row('4.4', 'Entity Relationship (ER) Diagram', '14'),
      row('4.5', 'Use Case Diagram', '16'),
      row('4.6', 'Algorithm Flowcharts', '17'),
      row('4.7', 'Database Design', '20'),
      row('4.8', 'UML Diagrams', '22'),
      row('4.8.1', 'Class Diagram', '22'),
      row('4.8.2', 'Sequence Diagram', '23'),
      row('4.8.3', 'Activity Diagram', '23'),
      row('4.9', 'Component Diagram', '24'),
      row('4.10', 'Deployment Diagram', '24'),
      row('4.11', 'Gantt Chart and Time Schedule', '25'),
      row('Chapter 5', 'Implementation', '24'),
      row('5.1', 'Development Environment and Tools', '24'),
      row('5.2', 'Project Structure', '24'),
      row('5.3', 'Module Implementation Details', '25'),
      row('Chapter 6', 'Testing', '27'),
      row('6.1', 'Testing Strategy', '27'),
      row('6.2', 'Test Cases and Results', '27'),
      row('Chapter 7', 'Conclusion and Future Work', '31'),
      row('7.1', 'Conclusion', '31'),
      row('7.2', 'Limitations', '31'),
      row('7.3', 'Future Enhancements', '32'),
      row('', 'References', '33'),
    ], [15, 70, 15]),
  ];
}

// ── LIST OF FIGURES ───────────────────────────────────────
function listOfFigures() {
  return [
    chHead('LIST OF FIGURES'),
    bl(),
    dtable(['Figure No.', 'Title', 'Page'], [
      ['Figure 1', 'System Architecture Diagram (3-Tier)', '11'],
      ['Figure 2', 'Block Diagram (High-Level)', '11'],
      ['Figure 3', 'Waterfall Model', '12'],
      ['Figure 4', 'Data Flow Diagram – Level 0 (Context Diagram)', '12'],
      ['Figure 5', 'Data Flow Diagram – Level 1', '13'],
      ['Figure 6', 'Entity Relationship (ER) Diagram', '14'],
      ['Figure 7', 'Use Case Diagram', '16'],
      ['Figure 8', 'Flowchart: Automated Reordering Algorithm', '17'],
      ['Figure 9', 'Flowchart: Demand Forecasting Algorithm', '18'],
      ['Figure 10', 'Flowchart: Inventory Optimization Algorithm', '19'],
      ['Figure 11', 'UML Class Diagram (High-Level)', '22'],
      ['Figure 12', 'UML Sequence Diagram (Sales Order Creation)', '23'],
      ['Figure 13', 'UML Activity Diagram (Purchase Order Receiving)', '23'],
      ['Figure 14', 'Component Diagram', '24'],
      ['Figure 15', 'Deployment Diagram', '24'],
      ['Figure 16', 'Gantt Chart (3 Months)', '25'],
    ], [20, 60, 20]),
  ];
}

// ── LIST OF TABLES ────────────────────────────────────────
function listOfTables() {
  return [
    chHead('LIST OF TABLES'),
    bl(),
    dtable(['Table No.', 'Title', 'Page'], [
      ['Table 1', 'Hardware Requirements', '9'],
      ['Table 2', 'Software Requirements', '10'],
      ['Table 3', 'Technology Stack Used', '10'],
      ['Table 4', 'Users Collection – Field Description', '20'],
      ['Table 5', 'Products Collection – Field Description', '21'],
      ['Table 6', 'Suppliers Collection – Field Description', '22'],
      ['Table 7', 'PurchaseOrders Collection – Field Description', '22'],
      ['Table 8', 'SalesOrders Collection – Field Description', '23'],
      ['Table 9', 'SalesHistory Collection – Field Description', '23'],
      ['Table 10', 'InventoryTransactions Collection – Field Description', '23'],
      ['Table 11', 'Categories Collection – Field Description', '23'],
      ['Table 12', 'Use Case Role Matrix', '16'],
      ['Table 13', 'Time Schedule (3 Months)', '25'],
      ['Table 14', 'Test Cases and Results', '27'],
    ], [20, 60, 20]),
  ];
}

// ── CHAPTER 1 ─────────────────────────────────────────────
function chapter1() {
  return [
    chHead('CHAPTER 1: INTRODUCTION'),
    sh('1.1 Background'),
    p('In the modern business landscape, effective inventory management is a cornerstone of operational success. Inventory management involves overseeing the ordering, storage, and use of products and components that a business deals in. Poorly managed inventory leads to stockouts, overstocking, revenue loss, and poor customer satisfaction.', { firstLine: true }),
    bl(),
    p('In Nepal, most small and medium enterprises (SMEs) still rely on manual stock registers and spreadsheets such as Microsoft Excel. These methods are prone to human errors, lack real-time visibility, and offer no analytical insight for business decision-making.', { firstLine: true }),
    bl(),
    p('With the advancement of web technologies — particularly the JavaScript ecosystem — it is now feasible to build cost-effective, powerful, and scalable inventory systems. This project develops a full-stack web-based Inventory Management System (IMS) using the MERN stack (MongoDB, Express.js, React.js, Node.js), with intelligent algorithmic modules that go beyond basic stock tracking.', { firstLine: true }),

    sh('1.2 Problem Statement'),
    p('The following critical problems are observed in manual or spreadsheet-based inventory management:', { firstLine: true }),
    bl(),
    lp('•   No real-time visibility into current stock levels.'),
    lp('•   No automated mechanism to trigger stock reordering when levels fall below safe limits.'),
    lp('•   Inability to forecast future product demand from historical sales data.'),
    lp('•   No role-based access control; any user can modify sensitive inventory records.'),
    lp('•   No centralized management of suppliers, purchase orders, and sales orders.'),
    lp('•   Absence of analytical reports for strategic decision-making.'),
    lp('•   No barcode scanning support for quick product identification.'),

    sh('1.3 Objectives'),
    p('The main objectives of this project are:', { firstLine: true }),
    bl(),
    lp('1.  To develop a role-based, web-based Inventory Management System using the MERN stack.'),
    lp('2.  To implement secure JWT-based authentication with admin-approval workflow for new accounts.'),
    lp('3.  To provide full CRUD operations for products, suppliers, categories, purchase orders, and sales orders.'),
    lp('4.  To implement an Automated Reordering Algorithm that auto-generates purchase orders for low-stock items.'),
    lp('5.  To build a Demand Forecasting module using Simple Moving Average (SMA) on historical sales data.'),
    lp('6.  To develop an Inventory Optimization module classifying products by demand and stock health.'),
    lp('7.  To generate analytical reports: stock levels, sales trends, inventory turnover, low-stock alerts, and top-selling products.'),
    lp('8.  To integrate barcode scanning for rapid product identification.'),

    sh('1.4 Scope of the Project'),
    p('In Scope:', { bold: true }),
    lp('•   User management (register, login, approve, disable) with Admin and Staff roles.'),
    lp('•   Product catalog with SKU, barcode, category, price, cost, reorder level.'),
    lp('•   Supplier and Category management.'),
    lp('•   Purchase Order and Sales Order lifecycle management.'),
    lp('•   Three intelligent algorithmic modules (Auto-reorder, Demand Forecast, Optimization).'),
    lp('•   Five report types with interactive charts.'),
    lp('•   Barcode scanning via device camera.'),
    bl(),
    p('Out of Scope:', { bold: true }),
    lp('•   Mobile application (Android/iOS).'),
    lp('•   Multi-warehouse or multi-branch management.'),
    lp('•   Payment gateway or financial accounting integration.'),
    lp('•   Email/SMS notification system.'),

    sh('1.5 Report Organization'),
    p('This report is organized into seven chapters. Chapter 2 covers background study and related technologies. Chapter 3 analyzes the existing system and proposes the new system with feasibility discussion. Chapter 4 presents detailed system design including all diagrams. Chapter 5 describes the implementation. Chapter 6 covers testing. Chapter 7 concludes with limitations and future enhancements.', { firstLine: true }),
  ];
}

// ── CHAPTER 2 ─────────────────────────────────────────────
function chapter2() {
  return [
    chHead('CHAPTER 2: BACKGROUND STUDY'),
    sh('2.1 Inventory Management Systems Overview'),
    p('Inventory Management Systems (IMS) are software solutions that help organizations track and control their inventory throughout the entire supply chain. According to Heizer & Render (2014), effective inventory management enables businesses to minimize holding costs while preventing stockouts.', { firstLine: true }),
    bl(),
    p('Modern IMS solutions have evolved from simple desktop applications to cloud-based, multi-user platforms with real-time dashboards and AI-driven forecasting capabilities. Key functionalities typically include stock tracking, reorder management, supplier management, sales and purchase order processing, and report generation.', { firstLine: true }),

    sh('2.2 Related Systems and Literature Review'),
    p('Several commercial and open-source inventory management systems exist, including:', { firstLine: true }),
    bl(),
    p('TradeGecko (QuickBooks Commerce): A cloud-based inventory and order management system. It supports multi-channel inventory and offers demand forecasting but is expensive for small businesses.', { bold: false, left: true }),
    bl(),
    p('Odoo Inventory: An open-source ERP module with advanced inventory management. While powerful, it is complex to set up and requires significant server resources.', { left: true }),
    bl(),
    p('inFlow Inventory: A desktop-plus-cloud solution with barcode scanning. Limited algorithm-based decision support.', { left: true }),
    bl(),
    p('None of the above solutions are specifically designed for small Nepali businesses with a focus on algorithmic intelligence at an affordable cost. This project fills that gap by providing a MERN-based, easy-to-deploy, algorithm-driven IMS.', { firstLine: true }),

    sh('2.3 Development Technologies'),
    p('MongoDB is a NoSQL document-oriented database that stores data in flexible JSON-like documents. It is horizontally scalable and ideal for applications with evolving schemas like an IMS.', { firstLine: true }),
    bl(),
    p('Express.js is a minimal and flexible Node.js web application framework providing a robust set of features for web and mobile applications. It is the de-facto standard for building RESTful APIs in the Node.js ecosystem.', { firstLine: true }),
    bl(),
    p('React.js is a JavaScript library for building user interfaces, maintained by Meta. Its component-based architecture, virtual DOM, and rich ecosystem (React Router, Context API) make it ideal for building dynamic SPAs.', { firstLine: true }),
    bl(),
    p('Node.js is a JavaScript runtime built on Chrome\'s V8 engine. Its non-blocking, event-driven architecture makes it highly efficient for I/O-bound operations like API servers.', { firstLine: true }),
    bl(),
    p('Mongoose is an Object Data Modeling (ODM) library for MongoDB and Node.js. It provides schema validation, middleware hooks, and a query API that simplifies database interactions.', { firstLine: true }),
    bl(),
    p('JSON Web Tokens (JWT) provide a compact, URL-safe means of representing claims between two parties. The system uses JWT for stateless session management, where the token is stored client-side and sent in the Authorization header of each request.', { firstLine: true }),
  ];
}

// ── CHAPTER 3 ─────────────────────────────────────────────
function chapter3() {
  return [
    chHead('CHAPTER 3: SYSTEM ANALYSIS'),
    sh('3.1 Analysis of Existing System'),
    p('The existing inventory management approach in most small businesses in Nepal involves:', { firstLine: true }),
    bl(),
    lp('•   Physical stock registers and ledgers maintained by hand.'),
    lp('•   Microsoft Excel spreadsheets for product listing and stock counts.'),
    lp('•   Manual billing and invoice systems (often paper-based).'),
    lp('•   No integration between purchasing, sales, and stock management.'),

    sh('3.2 Drawbacks of Existing System'),
    lp('•   Time-consuming and error-prone data entry.'),
    lp('•   No real-time stock visibility; requires manual counting.'),
    lp('•   Stockouts and overstocking due to lack of automated alerts.'),
    lp('•   No demand forecasting capability.'),
    lp('•   Difficult to generate reports and analytics.'),
    lp('•   Data not accessible remotely; tied to a single physical location.'),
    lp('•   No security controls — any staff member can alter any record.'),

    sh('3.3 Proposed System'),
    p('The proposed Inventory Management System is a web-based application accessible from any device with a browser. It addresses all the above drawbacks by:', { firstLine: true }),
    bl(),
    lp('•   Providing real-time stock visibility through an interactive dashboard.'),
    lp('•   Implementing role-based access control (Admin vs Staff).'),
    lp('•   Automating reorder purchase orders when stock falls below set levels.'),
    lp('•   Forecasting future demand using Moving Average analysis.'),
    lp('•   Generating comprehensive reports with visual charts.'),
    lp('•   Centralizing all business data in a MongoDB cloud database.'),

    sh('3.4 Feasibility Study'),
    p('Technical Feasibility:', { bold: true }),
    p('The MERN stack is a proven, industry-standard technology for building scalable web applications. All required libraries are open-source, well-documented, and actively maintained. No specialized hardware is required.', { firstLine: true }),
    bl(),
    p('Economic Feasibility:', { bold: true }),
    p('All technologies used are free and open-source. MongoDB Atlas provides a free tier for development. Deployment can be done on free platforms (Render for backend, Vercel for frontend). The total development cost is effectively zero beyond developer time.', { firstLine: true }),
    bl(),
    p('Operational Feasibility:', { bold: true }),
    p('The system features a clean, modern user interface designed for ease of use. Minimal training is required. The web-based nature means no installation is needed on end-user devices.', { firstLine: true }),

    sh('3.5 System Requirements'),
    p('3.5.1 Hardware Requirements', { bold: true }),
    bl(),
    tblCap('Hardware Requirements'),
    dtable(['Component', 'Minimum Requirement'], [
      ['Processor', 'Intel Core i3 or AMD equivalent'],
      ['RAM', '4 GB or more'],
      ['Storage', '10 GB free disk space'],
      ['Network', 'Broadband internet connection'],
      ['Display', '1280 x 768 resolution or higher'],
    ], [30, 70]),
    bl(),
    p('3.5.2 Software Requirements', { bold: true }),
    bl(),
    tblCap('Software Requirements'),
    dtable(['Software', 'Version / Details'], [
      ['Operating System', 'Windows 10 / Ubuntu 20.04 / macOS 11+'],
      ['Node.js', 'v18.x or higher'],
      ['MongoDB', 'v6.x (local or MongoDB Atlas cloud)'],
      ['npm', 'v9.x or higher'],
      ['Web Browser', 'Google Chrome / Mozilla Firefox (latest)'],
      ['Code Editor', 'Visual Studio Code (recommended)'],
    ], [30, 70]),
    bl(),
    p('3.5.3 Technology Stack', { bold: true }),
    bl(),
    tblCap('Technology Stack Used'),
    dtable(['Layer', 'Technology', 'Purpose'], [
      ['Frontend', 'React.js 18', 'UI components and routing'],
      ['Frontend', 'React Router DOM v6', 'Client-side navigation'],
      ['Frontend', 'Recharts v2', 'Interactive charts and graphs'],
      ['Frontend', 'HTML5-QRCode', 'Barcode/QR scanning'],
      ['Frontend', 'Axios v1', 'HTTP requests to backend API'],
      ['Frontend', 'React-Toastify', 'User notifications'],
      ['Backend', 'Node.js v18', 'Server runtime environment'],
      ['Backend', 'Express.js v4', 'RESTful API framework'],
      ['Database', 'MongoDB with Mongoose', 'Data storage and ODM'],
      ['Security', 'jsonwebtoken (JWT)', 'Authentication tokens'],
      ['Security', 'bcryptjs', 'Password hashing'],
      ['Validation', 'express-validator', 'Input validation'],
      ['Dev Tools', 'nodemon', 'Auto-restart on file changes'],
    ], [25, 35, 40]),
  ];
}

module.exports = { toc, listOfFigures, listOfTables, chapter1, chapter2, chapter3 };
