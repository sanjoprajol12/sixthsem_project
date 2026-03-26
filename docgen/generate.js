'use strict';
const {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel,
  Packer, PageNumber, Paragraph, ShadingType, Table, TableCell,
  TableRow, TextRun, VerticalAlign, WidthType, convertInchesToTwip,
  UnderlineType, TableLayoutType
} = require('docx');
const fs = require('fs');

// ── helpers ────────────────────────────────────────────────
const pt = n => n * 2;

function tr(text, o = {}) {
  return new TextRun({
    text: String(text),
    font: 'Times New Roman',
    size: o.size || pt(12),
    bold: o.bold || false,
    italics: o.italic || false,
    color: o.color || undefined,
    underline: o.underline ? { type: UnderlineType.SINGLE } : undefined,
  });
}

function p(content, o = {}) {
  const runs = typeof content === 'string' ? [tr(content, o)]
    : Array.isArray(content) ? content : [content];
  return new Paragraph({
    children: runs,
    alignment: o.align || AlignmentType.JUSTIFIED,
    heading: o.heading,
    spacing: { before: o.before || 0, after: o.after !== undefined ? o.after : 180, line: 360 },
    indent: o.firstLine ? { firstLine: 720 } : o.left ? { left: 720 } : undefined,
    pageBreakBefore: o.pageBreak || false,
  });
}

const cp = (t, o = {}) => p(t, { ...o, align: AlignmentType.CENTER });
const lp = (t, o = {}) => p(t, { ...o, align: AlignmentType.LEFT });
const bl = () => new Paragraph({ children: [new TextRun('')], spacing: { after: 180, line: 360 } });
const bls = n => Array.from({ length: n }, bl);

function chHead(title) {
  return new Paragraph({
    children: [tr(title, { bold: true, size: pt(14) })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 360, line: 360 },
    pageBreakBefore: true,
  });
}

function sh(t) {
  return new Paragraph({ children: [tr(t, { bold: true })], spacing: { before: 280, after: 180, line: 360 } });
}

// ── table helpers ──────────────────────────────────────────
function tc(content, o = {}) {
  let kids;
  if (typeof content === 'string') {
    kids = [new Paragraph({
      children: [tr(content, { bold: o.bold, size: o.fs || pt(11), color: o.tc })],
      alignment: o.align || AlignmentType.CENTER,
      spacing: { before: 60, after: 60 },
    })];
  } else kids = Array.isArray(content) ? content : [content];

  const bdr = (c) => ({ style: BorderStyle.SINGLE, size: 1, color: c || '000000' });
  const nb = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return new TableCell({
    children: kids,
    columnSpan: o.cs || 1,
    rowSpan: o.rs || 1,
    verticalAlign: o.va || VerticalAlign.CENTER,
    width: o.w ? { size: o.w, type: WidthType.PERCENTAGE } : undefined,
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    borders: o.nob ? { top: nb, bottom: nb, left: nb, right: nb }
      : { top: bdr(), bottom: bdr(), left: bdr(), right: bdr() },
  });
}

const trow = (cells, hdr) => new TableRow({ children: cells, tableHeader: hdr || false });

function tbl(rows, wPct) {
  return new Table({ rows, width: { size: wPct || 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED });
}

function dtable(headers, data, widths) {
  const hrow = trow(headers.map((h, i) => tc(h, { fill: '1F3864', bold: true, tc: 'FFFFFF', w: widths ? widths[i] : undefined })), true);
  const drows = data.map((r, ri) => trow(r.map((c, ci) => tc(c, {
    fill: ri % 2 === 0 ? 'FFFFFF' : 'DAE3F3',
    align: ci === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
    w: widths ? widths[ci] : undefined,
  }))));
  return tbl([hrow, ...drows]);
}

// figure/table counters
let figN = 0, tblN = 0;
const figCap = t => { figN++; return cp(`Figure ${figN}: ${t}`, { before: 80, after: 280, italic: true }); };
const tblCap = t => { tblN++; return cp(`Table ${tblN}: ${t}`, { before: 80, after: 100, italic: true }); };

// ── DIAGRAM HELPERS ────────────────────────────────────────
// A shaded box used in architecture/flowcharts
function diagBox(text, fill, cs) {
  return tbl([trow([tc(text, { fill: fill || 'BDD7EE', bold: true, cs: cs || 1, align: AlignmentType.CENTER, fs: pt(11) })])]);
}

const arrowP = () => cp('▼', { before: 0, after: 0 });

// ── COVER PAGE ────────────────────────────────────────────
function coverPage() {
  return [
    ...bls(2),
    cp('TRIBHUVAN UNIVERSITY', { bold: true, size: pt(16), after: 60 }),
    cp('Institute of Science and Technology', { bold: true, size: pt(13), after: 60 }),
    cp('─────────────────────────────────────────', { after: 60 }),
    cp('Arunima National College', { bold: true, size: pt(14), after: 40 }),
    cp('Kathmandu, Nepal', { after: 360 }),
    cp('A Project Report On', { italic: true, after: 160 }),
    cp('INVENTORY MANAGEMENT SYSTEM', { bold: true, size: pt(18), after: 60 }),
    cp('with Intelligent Inventory Algorithms', { bold: true, size: pt(13), after: 360 }),
    cp('Submitted in Partial Fulfillment of the Requirements for the Degree of', { after: 60 }),
    cp('Bachelor of Computer Application (BCA)', { bold: true, size: pt(13), after: 360 }),

    tbl([
      trow([
        tc([
          new Paragraph({ children: [tr('Submitted By:', { bold: true, size: pt(12) })], spacing: { after: 60 } }),
          new Paragraph({ children: [tr('Prajwal Sainju', { bold: true, size: pt(13) })], spacing: { after: 40 } }),
          new Paragraph({ children: [tr('Roll No.: 6-2-142-13-2022', { size: pt(12) })], spacing: { after: 40 } }),
          new Paragraph({ children: [tr('BCA 6th Semester', { size: pt(12) })], spacing: { after: 60 } }),
        ], { nob: true, align: AlignmentType.LEFT }),
        tc([
          new Paragraph({ children: [tr('Supervised By:', { bold: true, size: pt(12) })], spacing: { after: 60 } }),
          new Paragraph({ children: [tr('Mr. Suman Dhital', { bold: true, size: pt(13) })], spacing: { after: 40 } }),
          new Paragraph({ children: [tr('Department of Computer Science', { size: pt(12) })], spacing: { after: 60 } }),
        ], { nob: true, align: AlignmentType.LEFT }),
      ])
    ]),

    ...bls(2),
    cp('Department of Computer Science', { after: 40 }),
    cp('Arunima National College', { after: 40 }),
    cp('Kathmandu, Nepal', { after: 40 }),
    cp('2026', { bold: true }),
  ];
}

// ── CERTIFICATE ───────────────────────────────────────────
function certificate() {
  return [
    chHead('SUPERVISOR\'S CERTIFICATE'),
    bl(),
    p('This is to certify that the project report entitled "Inventory Management System with Intelligent Inventory Algorithms" submitted by Prajwal Sainju (Roll No.: 6-2-142-13-2022), student of BCA 6th Semester at Arunima National College, Tribhuvan University, Kathmandu, is a record of genuine work carried out under my supervision.', { firstLine: true }),
    bl(),
    p('This project is submitted in partial fulfillment of the requirements for the degree of Bachelor of Computer Application (BCA). I recommend it for acceptance.', { firstLine: true }),
    ...bls(4),
    tbl([trow([
      tc([
        new Paragraph({ children: [tr('Supervisor:', { bold: true })], spacing: { after: 100 } }),
        new Paragraph({ children: [tr('Mr. Suman Dhital')], spacing: { after: 100 } }),
        new Paragraph({ children: [tr('Dept. of Computer Science')], spacing: { after: 100 } }),
        new Paragraph({ children: [tr('Arunima National College')], spacing: { after: 100 } }),
        new Paragraph({ children: [tr('Signature: _____________________')], spacing: { after: 60 } }),
        new Paragraph({ children: [tr('Date: _________________________')], spacing: { after: 60 } }),
      ], { nob: true, align: AlignmentType.LEFT }),
      tc([
        new Paragraph({ children: [tr('Head of Department:', { bold: true })], spacing: { after: 100 } }),
        new Paragraph({ children: [tr('Dept. of Computer Science')], spacing: { after: 100 } }),
        new Paragraph({ children: [tr('Arunima National College')], spacing: { after: 100 } }),
        new Paragraph({ children: [tr('')], spacing: { after: 100 } }),
        new Paragraph({ children: [tr('Signature: _____________________')], spacing: { after: 60 } }),
        new Paragraph({ children: [tr('Date: _________________________')], spacing: { after: 60 } }),
      ], { nob: true, align: AlignmentType.LEFT }),
    ])]),
  ];
}

// ── DECLARATION ───────────────────────────────────────────
function declaration() {
  return [
    chHead('DECLARATION'),
    bl(),
    p('I hereby declare that the project work entitled "Inventory Management System with Intelligent Inventory Algorithms" submitted to the Department of Computer Science, Arunima National College, Tribhuvan University is a record of original work done by me. This project work has not been submitted elsewhere for the award of any Degree or Diploma.', { firstLine: true }),
    bl(),
    p('All sources of information have been duly acknowledged.', { firstLine: true }),
    ...bls(5),
    lp('Name: Prajwal Sainju', { bold: true }),
    lp('Roll No.: 6-2-142-13-2022'),
    lp('BCA 6th Semester'),
    lp('Arunima National College'),
    lp('Signature: _____________________'),
    lp('Date: 2026-03-26'),
  ];
}

// ── ACKNOWLEDGEMENT ───────────────────────────────────────
function acknowledgement() {
  return [
    chHead('ACKNOWLEDGEMENT'),
    bl(),
    p('I would like to express my sincere gratitude to my project supervisor Mr. Suman Dhital for his invaluable guidance, patient mentorship, constructive feedback, and continuous encouragement throughout the development of this project.', { firstLine: true }),
    bl(),
    p('I extend my heartfelt thanks to the Head of the Department of Computer Science and all the faculty members of Arunima National College for their academic support during my BCA program.', { firstLine: true }),
    bl(),
    p('I am also grateful to Tribhuvan University for providing the academic framework and guidelines for this project. Finally, I sincerely thank my family and friends for their unwavering moral support throughout this journey.', { firstLine: true }),
    ...bls(4),
    lp('Prajwal Sainju', { bold: true }),
    lp('Roll No.: 6-2-142-13-2022'),
    lp('BCA 6th Semester, Arunima National College'),
    lp('Date: 2026-03-26'),
  ];
}

// ── ABSTRACT ──────────────────────────────────────────────
function abstract() {
  return [
    chHead('ABSTRACT'),
    bl(),
    p('This project presents the design and development of a comprehensive web-based Inventory Management System (IMS) using the MERN stack — MongoDB, Express.js, React.js, and Node.js. The system enables businesses to efficiently manage stock, monitor sales, handle purchase orders, and manage suppliers through a secure, role-based web application.', { firstLine: true }),
    bl(),
    p('The system implements dual-role access control (Admin and Staff) secured by JWT-based authentication and bcrypt password hashing. A key feature is the implementation of three intelligent algorithmic modules: (1) Automated Reordering which detects low-stock products and auto-generates supplier purchase orders; (2) Demand Forecasting using Simple Moving Average to predict future demand for 30, 60, and 90-day periods; and (3) Inventory Optimization which classifies products by demand pattern and stock health with actionable recommendations.', { firstLine: true }),
    bl(),
    p('The frontend uses React.js 18 with Recharts for interactive charts, HTML5-QRCode for barcode scanning, and React-Toastify for notifications. The backend provides nine RESTful API route modules covering authentication, products, suppliers, categories, purchase orders, sales orders, reports, users, and algorithms. Twenty functional test cases were performed with 100% pass rate.', { firstLine: true }),
    bl(),
    p('Keywords: Inventory Management, MERN Stack, JWT, Demand Forecasting, Automated Reordering, REST API, MongoDB.', { italic: true }),
  ];
}

module.exports = { coverPage, certificate, declaration, acknowledgement, abstract, dtable, tblCap, figCap, chHead, sh, p, cp, lp, bl, bls, tr, tc, trow, tbl, arrowP, diagBox, pt, AlignmentType };
