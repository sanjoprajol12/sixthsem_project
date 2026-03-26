'use strict';
const {
  AlignmentType, Document, Footer, Header, Packer, PageNumber,
  Paragraph, TextRun, convertInchesToTwip, NumberFormat
} = require('docx');
const fs = require('fs');
const path = require('path');

const G = require('./generate.js');
const C123 = require('./chapters1to3.js');
const C4 = require('./chapter4.js');
const C57 = require('./chapters5to7.js');

const { coverPage, certificate, declaration, acknowledgement, abstract } = G;
const { toc, listOfFigures, listOfTables, chapter1, chapter2, chapter3 } = C123;
const { chapter4 } = C4;
const { chapter5, chapter6, chapter7, references } = C57;

// ── PAGE NUMBER FOOTER ─────────────────────────────────────
function makeFooter() {
  return new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({ children: [PageNumber.CURRENT], font: 'Times New Roman', size: 22 }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    ],
  });
}

// ── BUILD DOCUMENT ─────────────────────────────────────────
async function buildDoc() {
  const margins = {
    top: convertInchesToTwip(1),
    bottom: convertInchesToTwip(1),
    left: convertInchesToTwip(1.5),
    right: convertInchesToTwip(1),
  };

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Times New Roman', size: 24 },
          paragraph: { spacing: { line: 360 } },
        },
      },
    },
    sections: [
      // ── SECTION 1: Cover (no footer) ──────────────────────
      {
        properties: {
          page: {
            margin: margins,
            pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN },
          },
        },
        children: [
          ...coverPage(),
        ],
      },

      // ── SECTION 2: Prelim pages (roman numerals) ──────────
      {
        properties: {
          page: {
            margin: margins,
            pageNumbers: { start: 2, formatType: NumberFormat.LOWER_ROMAN },
          },
        },
        footers: { default: makeFooter() },
        children: [
          ...certificate(),
          ...declaration(),
          ...acknowledgement(),
          ...abstract(),
          ...toc(),
          ...listOfFigures(),
          ...listOfTables(),
        ],
      },

      // ── SECTION 3: Main chapters (arabic numerals) ────────
      {
        properties: {
          page: {
            margin: margins,
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          },
        },
        footers: { default: makeFooter() },
        children: [
          ...chapter1(),
          ...chapter2(),
          ...chapter3(),
          ...chapter4(),
          ...chapter5(),
          ...chapter6(),
          ...chapter7(),
          ...references(),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(__dirname, '..', 'Inventory_Management_System_BCA_6th_Sem.docx');
  fs.writeFileSync(outPath, buffer);
  console.log('✅ DOCX generated successfully!');
  console.log('📄 File saved at:', outPath);
}

buildDoc().catch(err => {
  console.error('❌ Error generating DOCX:', err.message);
  process.exit(1);
});
