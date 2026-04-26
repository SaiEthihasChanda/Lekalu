const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const markdownPath = path.join(__dirname, 'USER_MANUAL.md');
const markdownContent = fs.readFileSync(markdownPath, 'utf8');
const logoPath = path.join(__dirname, 'public', 'lekalu-logo.png');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 70, bottom: 60, left: 60, right: 60 },
  bufferPages: true,
  info: {
    Title: 'Lekalu - User Manual',
    Author: 'Lekalu',
    Subject: 'User Manual',
    CreationDate: new Date()
  }
});

const outputPath = path.join(__dirname, 'LEKALU_USER_MANUAL.pdf');
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

const colors = {
  primary: '#1e3a5f',
  secondary: '#2563eb',
  accent: '#0ea5e9',
  text: '#1f2937',
  textLight: '#4b5563',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  bgLight: '#f9fafb',
  tipBg: '#eff6ff',
  tipBorder: '#3b82f6',
  warningBg: '#fefce8',
  warningBorder: '#f59e0b',
  white: '#ffffff'
};

let pageNumber = 0;
let hasLogo = fs.existsSync(logoPath);

function checkPageBreak(requiredSpace) {
  if (doc.y + requiredSpace > doc.page.height - 80) {
    addPage();
  }
}

function addPage() {
  doc.addPage();
  pageNumber++;
  doc.y = 70;
  addHeader();
}

function addHeader() {
  const headerY = 25;
  const pageWidth = doc.page.width;
  doc.strokeColor(colors.border).lineWidth(0.5)
    .moveTo(60, headerY + 20).lineTo(pageWidth - 60, headerY + 20).stroke();
  doc.fontSize(8).fillColor(colors.textMuted).font('Helvetica-Bold')
    .text('LEKALU', 60, headerY + 5, { align: 'left' });
  doc.fontSize(8).fillColor(colors.textMuted).font('Helvetica')
    .text('User Manual', 105, headerY + 5, { align: 'left' });
  doc.fontSize(8).fillColor(colors.textMuted)
    .text(`${pageNumber}`, pageWidth - 60, headerY + 5, { align: 'right', width: 40 });
}

// ============================================
// COVER PAGE
// ============================================

function renderCoverPage() {
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;
  const centerY = pageHeight / 2 - 80;

  doc.rect(0, 0, pageWidth, pageHeight).fill(colors.white);
  doc.rect(0, 0, pageWidth, 8).fill(colors.primary);

  if (hasLogo) {
    try {
      const logoWidth = 140;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.image(logoPath, logoX, centerY - 120, { width: logoWidth });
      doc.y = centerY + 40;
    } catch (e) {
      doc.y = centerY - 60;
      doc.fontSize(36).fillColor(colors.primary).font('Helvetica-Bold')
        .text('LEKALU', 60, doc.y, { align: 'center' });
      doc.y += 50;
    }
  } else {
    doc.y = centerY - 60;
    doc.fontSize(36).fillColor(colors.primary).font('Helvetica-Bold')
      .text('LEKALU', 60, doc.y, { align: 'center' });
    doc.y += 50;
  }

  doc.fontSize(26).fillColor(colors.primary).font('Helvetica-Bold')
    .text('User Manual', 60, doc.y, { align: 'center' });
  doc.y += 25;

  doc.fontSize(13).fillColor(colors.textLight).font('Helvetica-Oblique')
    .text('Your Personal Finance Companion', 60, doc.y, { align: 'center' });
  doc.y += 60;

  const lineWidth = 100;
  doc.strokeColor(colors.secondary).lineWidth(2)
    .moveTo((pageWidth - lineWidth) / 2, doc.y)
    .lineTo((pageWidth + lineWidth) / 2, doc.y).stroke();
  doc.y += 40;

  doc.fontSize(10).fillColor(colors.textMuted).font('Helvetica')
    .text('Version 1.0  |  April 2026', 60, doc.y, { align: 'center' });
  doc.y += 15;
  doc.fontSize(10).fillColor(colors.secondary).font('Helvetica')
    .text('lekalu.web.app', 60, doc.y, { align: 'center' });

  doc.rect(0, pageHeight - 30, pageWidth, 30).fill(colors.primary);
}

// ============================================
// FORMATTED TEXT RENDERING
// ============================================

function parseInlineFormatting(text) {
  const segments = [];
  let remaining = text;
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), bold: false });
    }

    const content = match[0];
    if (content.startsWith('**') && content.endsWith('**')) {
      segments.push({ text: content.slice(2, -2), bold: true });
    } else if (content.startsWith('*') && content.endsWith('*') && content.length > 2) {
      segments.push({ text: content.slice(1, -1), bold: false, italic: true });
    } else if (content.startsWith('`') && content.endsWith('`')) {
      segments.push({ text: content.slice(1, -1), code: true });
    } else if (content.startsWith('[') && content.includes('](')) {
      const linkMatch = content.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        segments.push({ text: linkMatch[1], link: linkMatch[2], bold: false });
      }
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), bold: false });
  }

  return segments.length > 0 ? segments : [{ text: text, bold: false }];
}

function renderFormattedLine(segments, x, y, options = {}) {
  let currentX = x;
  const maxWidth = options.width || (doc.page.width - 120);

  segments.forEach(seg => {
    doc.fontSize(options.fontSize || 10.5);
    if (seg.bold) doc.font('Helvetica-Bold');
    else if (seg.italic) doc.font('Helvetica-Oblique');
    else if (seg.code) doc.font('Courier');
    else doc.font('Helvetica');

    doc.fillColor(seg.link ? colors.secondary : colors.text);

    const segWidth = doc.widthOfString(seg.text);
    if (currentX + segWidth > x + maxWidth) {
      return;
    }

    doc.text(seg.text, currentX, y, { continued: true });
    currentX += segWidth;
  });

  doc.text('');
}

function addRichParagraph(text, options = {}) {
  const fontSize = options.fontSize || 10.5;
  const indent = options.indent || 0;

  const segments = parseInlineFormatting(text);
  const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  doc.fontSize(fontSize).font('Helvetica');
  const height = doc.heightOfString(cleanText, {
    width: doc.page.width - 120 - indent,
    lineGap: 3
  });

  checkPageBreak(height + 20);

  let currentY = doc.y;
  const x = 60 + indent;
  const maxWidth = doc.page.width - 120 - indent;

  doc.fontSize(fontSize);

  segments.forEach((seg, index) => {
    if (index === 0 && options.bullet) {
      doc.fillColor(colors.secondary);
      if (options.bullet === 'disc') {
        doc.circle(x - 8, currentY + 5, 2).fill();
      } else if (options.bullet === 'number') {
        doc.font('Helvetica-Bold').text(`${options.number}.`, x - 25, currentY, { width: 20, align: 'right' });
      }
      doc.fontSize(fontSize);
    }

    if (seg.bold) doc.font('Helvetica-Bold');
    else if (seg.italic) doc.font('Helvetica-Oblique');
    else if (seg.code) doc.font('Courier');
    else doc.font('Helvetica');

    doc.fillColor(seg.link ? colors.secondary : colors.text);

    if (index === 0) {
      doc.text(seg.text, x, currentY, {
        width: maxWidth,
        lineGap: 3,
        continued: index < segments.length - 1
      });
    } else {
      doc.text(seg.text, { continued: index < segments.length - 1 });
    }
  });

  doc.y += 12;
}

// ============================================
// HEADINGS
// ============================================

function addHeading1(text) {
  checkPageBreak(60);
  doc.rect(50, doc.y - 10, doc.page.width - 100, 40).fill(colors.primary);
  doc.fontSize(18).fillColor(colors.white).font('Helvetica-Bold')
    .text(text, 60, doc.y, { width: doc.page.width - 120 });
  doc.y += 40;
}

function addHeading2(text) {
  checkPageBreak(50);
  doc.rect(50, doc.y + 5, 4, 20).fill(colors.secondary);
  doc.fontSize(15).fillColor(colors.primary).font('Helvetica-Bold')
    .text(text, 60, doc.y + 5, { width: doc.page.width - 120 });
  doc.y += 35;
  doc.strokeColor(colors.border).lineWidth(1)
    .moveTo(60, doc.y - 8).lineTo(doc.page.width - 60, doc.y - 8).stroke();
  doc.y += 10;
}

function addHeading3(text) {
  checkPageBreak(40);
  doc.fontSize(13).fillColor(colors.primary).font('Helvetica-Bold')
    .text(text, 60, doc.y, { width: doc.page.width - 120 });
  doc.y += 20;
}

function addHeading4(text) {
  checkPageBreak(30);
  doc.fontSize(11).fillColor(colors.text).font('Helvetica-Bold')
    .text(text, 60, doc.y, { width: doc.page.width - 120 });
  doc.y += 15;
}

// ============================================
// LISTS & SPECIAL ELEMENTS
// ============================================

function addBulletPoint(text, level = 0) {
  const indent = level * 20;
  const x = 60 + indent;
  const textWidth = doc.page.width - 120 - indent - 15;

  const segments = parseInlineFormatting(text);
  const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  doc.fontSize(10.5).font('Helvetica');
  const height = doc.heightOfString(cleanText, { width: textWidth, lineGap: 2 });
  checkPageBreak(height + 15);

  doc.fillColor(colors.secondary).circle(x + 2, doc.y + 5, 2).fill();

  let currentY = doc.y;
  segments.forEach((seg, index) => {
    if (seg.bold) doc.font('Helvetica-Bold');
    else if (seg.italic) doc.font('Helvetica-Oblique');
    else if (seg.code) doc.font('Courier');
    else doc.font('Helvetica');

    doc.fillColor(seg.link ? colors.secondary : colors.text);

    if (index === 0) {
      doc.text(seg.text, x + 12, currentY, {
        width: textWidth,
        lineGap: 2,
        continued: index < segments.length - 1
      });
    } else {
      doc.text(seg.text, { continued: index < segments.length - 1 });
    }
  });

  doc.y += 8;
}

function addNumberedPoint(text, number) {
  const x = 60;
  const textWidth = doc.page.width - 120 - 30;

  const segments = parseInlineFormatting(text);
  const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  doc.fontSize(10.5).font('Helvetica');
  const height = doc.heightOfString(cleanText, { width: textWidth, lineGap: 2 });
  checkPageBreak(height + 15);

  doc.fontSize(10).fillColor(colors.secondary).font('Helvetica-Bold')
    .text(`${number}.`, x, doc.y + 1, { width: 25, align: 'right' });

  let currentY = doc.y;
  segments.forEach((seg, index) => {
    if (seg.bold) doc.font('Helvetica-Bold');
    else if (seg.italic) doc.font('Helvetica-Oblique');
    else if (seg.code) doc.font('Courier');
    else doc.font('Helvetica');

    doc.fillColor(seg.link ? colors.secondary : colors.text);

    if (index === 0) {
      doc.text(seg.text, x + 30, currentY, {
        width: textWidth,
        lineGap: 2,
        continued: index < segments.length - 1
      });
    } else {
      doc.text(seg.text, { continued: index < segments.length - 1 });
    }
  });

  doc.y += 8;
}

function addTipBox(text) {
  const segments = parseInlineFormatting(text);
  const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  const padding = 15;
  const boxWidth = doc.page.width - 120;

  doc.fontSize(10).font('Helvetica');
  const textHeight = doc.heightOfString(cleanText, { width: boxWidth - 30, lineGap: 2 });
  const boxHeight = textHeight + padding * 2 + 22;

  checkPageBreak(boxHeight + 20);

  const boxY = doc.y;

  doc.roundedRect(60, boxY, boxWidth, boxHeight, 6)
    .fill(colors.tipBg).stroke(colors.tipBorder);

  doc.fontSize(10).fillColor(colors.secondary).font('Helvetica-Bold')
    .text('TIP', 75, boxY + 12);

  let currentY = boxY + 30;
  segments.forEach((seg, index) => {
    if (seg.bold) doc.font('Helvetica-Bold');
    else if (seg.italic) doc.font('Helvetica-Oblique');
    else if (seg.code) doc.font('Courier');
    else doc.font('Helvetica');

    doc.fillColor(seg.link ? colors.secondary : colors.text);

    if (index === 0) {
      doc.text(seg.text, 75, currentY, {
        width: boxWidth - 30,
        lineGap: 2,
        continued: index < segments.length - 1
      });
    } else {
      doc.text(seg.text, { continued: index < segments.length - 1 });
    }
  });

  doc.y = boxY + boxHeight + 15;
}

function addWarningBox(text) {
  const segments = parseInlineFormatting(text);
  const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  const padding = 15;
  const boxWidth = doc.page.width - 120;

  doc.fontSize(10).font('Helvetica');
  const textHeight = doc.heightOfString(cleanText, { width: boxWidth - 30, lineGap: 2 });
  const boxHeight = textHeight + padding * 2 + 22;

  checkPageBreak(boxHeight + 20);

  const boxY = doc.y;

  doc.roundedRect(60, boxY, boxWidth, boxHeight, 6)
    .fill(colors.warningBg).stroke(colors.warningBorder);

  doc.fontSize(10).fillColor(colors.warningBorder).font('Helvetica-Bold')
    .text('IMPORTANT', 75, boxY + 12);

  let currentY = boxY + 30;
  segments.forEach((seg, index) => {
    if (seg.bold) doc.font('Helvetica-Bold');
    else if (seg.italic) doc.font('Helvetica-Oblique');
    else if (seg.code) doc.font('Courier');
    else doc.font('Helvetica');

    doc.fillColor(seg.link ? colors.secondary : colors.text);

    if (index === 0) {
      doc.text(seg.text, 75, currentY, {
        width: boxWidth - 30,
        lineGap: 2,
        continued: index < segments.length - 1
      });
    } else {
      doc.text(seg.text, { continued: index < segments.length - 1 });
    }
  });

  doc.y = boxY + boxHeight + 15;
}

function addHorizontalRule() {
  checkPageBreak(25);
  doc.y += 10;
  doc.strokeColor(colors.borderLight).lineWidth(1)
    .moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y).stroke();
  doc.y += 15;
}

// ============================================
// TABLE HANDLING
// ============================================

function addTable(headers, rows) {
  const colWidth = (doc.page.width - 120) / headers.length;
  const rowHeight = 28;
  const headerHeight = 32;

  checkPageBreak(headerHeight + (rows.length * rowHeight) + 30);

  const tableY = doc.y;

  doc.rect(60, tableY, doc.page.width - 120, headerHeight)
    .fill(colors.primary);

  headers.forEach((header, i) => {
    doc.fontSize(9).fillColor(colors.white).font('Helvetica-Bold')
      .text(header, 65 + i * colWidth, tableY + 10, { width: colWidth - 10 });
  });

  rows.forEach((row, rowIndex) => {
    const rowY = tableY + headerHeight + (rowIndex * rowHeight);
    const bgColor = rowIndex % 2 === 0 ? colors.white : colors.bgLight;

    doc.rect(60, rowY, doc.page.width - 120, rowHeight)
      .fill(bgColor).stroke(colors.border);

    row.forEach((cell, i) => {
      const cleanCell = cell.replace(/💳/g, '').replace(/🏦/g, '').replace(/📊/g, '').replace(/👑/g, '').replace(/✓/g, '✔').replace(/✕/g, '✘').trim();
      doc.fontSize(9).fillColor(colors.text).font('Helvetica')
        .text(cleanCell || cell, 65 + i * colWidth, rowY + 8, { width: colWidth - 10 });
    });
  });

  doc.y = tableY + headerHeight + (rows.length * rowHeight) + 15;
}

// ============================================
// MARKDOWN PARSER
// ============================================

function renderMarkdown(content) {
  const lines = content.split('\n');
  let inCodeBlock = false;
  let inTable = false;
  let tableHeaders = [];
  let tableRows = [];
  let lastWasEmpty = true;
  let numberedCounter = 1;
  let lastHeaderLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('[//]')) continue;

    if (line.startsWith('## Table of Contents')) {
      while (i < lines.length && !lines[i].startsWith('---')) {
        i++;
      }
      continue;
    }

    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (!inCodeBlock) doc.y += 8;
      continue;
    }

    if (inCodeBlock) {
      checkPageBreak(16);
      doc.fontSize(9).fillColor(colors.textMuted).font('Courier')
        .text(line, 70, doc.y, { width: doc.page.width - 140 });
      doc.y += 14;
      continue;
    }

    if (line.match(/^---+$/)) {
      addHorizontalRule();
      lastWasEmpty = true;
      continue;
    }

    if (line.startsWith('# ')) {
      continue;
    } else if (line.startsWith('## ')) {
      numberedCounter = 1;
      const text = line.replace(/^##\s*/, '');
      if (doc.y > 150) addPage();
      addHeading1(text);
      lastHeaderLevel = 1;
      lastWasEmpty = false;
    } else if (line.startsWith('### ')) {
      numberedCounter = 1;
      addHeading2(line.replace(/^###\s*/, ''));
      lastHeaderLevel = 2;
      lastWasEmpty = false;
    } else if (line.startsWith('#### ')) {
      addHeading3(line.replace(/^####\s*/, ''));
      lastHeaderLevel = 3;
      lastWasEmpty = false;
    } else if (line.startsWith('|')) {
      if (line.match(/^\|[-:\s|]+\|$/)) continue;

      const cells = line.split('|')
        .filter(c => c.trim() !== '')
        .map(c => c.trim());

      if (cells.length > 0) {
        if (!inTable) {
          tableHeaders = cells;
          inTable = true;
          tableRows = [];
        } else {
          tableRows.push(cells);
        }
      }

      if (i + 1 >= lines.length || !lines[i + 1].startsWith('|')) {
        if (inTable && tableRows.length > 0) {
          addTable(tableHeaders, tableRows);
        }
        inTable = false;
        tableHeaders = [];
        tableRows = [];
      }
    } else if (line.trim() === '') {
      if (!lastWasEmpty && !inTable) doc.y += 8;
      lastWasEmpty = true;
      numberedCounter = 1;
    } else if (line.match(/^[-*]\s/)) {
      const text = line.replace(/^[-*]\s/, '');
      const indentMatch = text.match(/^(\s+)/);
      const level = indentMatch ? Math.floor(indentMatch[1].length / 2) : 0;
      const cleanText = text.replace(/^\s+/, '');
      addBulletPoint(cleanText, level);
      lastWasEmpty = false;
    } else if (line.match(/^\d+\.\s/)) {
      const text = line.replace(/^\d+\.\s/, '');
      addNumberedPoint(text, numberedCounter);
      numberedCounter++;
      lastWasEmpty = false;
    } else {
      if (line.trim()) {
        const lower = line.toLowerCase();
        if ((lower.startsWith('tip:') || lower.startsWith('**tip:**')) && line.length < 200) {
          const tipText = line.replace(/^\*\*Tip:\*\*\s*/i, '').replace(/^Tip:\s*/i, '');
          addTipBox(tipText);
        } else if ((lower.startsWith('important:') || lower.startsWith('**important:**') || lower.startsWith('**note:**') || lower.startsWith('note:')) && line.length < 250) {
          const warnText = line.replace(/^\*\*[^:*]+:\*\*\s*/i, '').replace(/^[^:\s]+:\s*/i, '');
          addWarningBox(warnText);
        } else {
          addRichParagraph(line);
        }
        lastWasEmpty = false;
      }
    }
  }
}

// ============================================
// MAIN EXECUTION
// ============================================

try {
  renderCoverPage();
  addPage();
  renderMarkdown(markdownContent);
  doc.end();

  stream.on('finish', () => {
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`✓ PDF generated successfully: ${outputPath}`);
      console.log(`  File size: ${(stats.size / 1024).toFixed(1)} KB`);
    }
  });

  stream.on('error', (err) => {
    console.error('Stream error:', err);
  });

} catch (error) {
  console.error('Error generating PDF:', error);
  process.exit(1);
}
