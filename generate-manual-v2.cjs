const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Read the markdown file
const markdownPath = path.join(__dirname, 'USER_MANUAL.md');
const markdownContent = fs.readFileSync(markdownPath, 'utf8');

// Create PDF document
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  info: {
    Title: 'Lekalu - User Manual',
    Author: 'Lekalu',
    Subject: 'User Manual for Personal Finance Tracking',
    CreationDate: new Date()
  }
});

// Pipe to file
const outputPath = path.join(__dirname, 'LEKALU_USER_MANUAL.pdf');
doc.pipe(fs.createWriteStream(outputPath));

// Colors - Vibrant Lekalu theme
const colors = {
  primary: '#1e40af',       // Deep blue
  secondary: '#3b82f6',     // Bright blue
  accent: '#0ea5e9',        // Sky blue
  success: '#10b981',       // Green
  warning: '#f59e0b',       // Orange/Yellow
  danger: '#ef4444',        // Red
  purple: '#8b5cf6',        // Purple
  pink: '#ec4899',          // Pink
  text: '#1f2937',          // Dark gray
  lightText: '#6b7280',    // Medium gray
  mutedText: '#9ca3af',     // Light gray
  white: '#ffffff',
  lightBg: '#f1f5f9',
  darkBg: '#0f172a'
};

// State
let currentY = 50;
let pageNumber = 0;
let isCoverPage = true;

function checkPageBreak(requiredSpace = 30) {
  if (currentY + requiredSpace > doc.page.height - 50) {
    addNewPage();
  }
}

function addNewPage() {
  // Add footer to current page before switching
  if (!isCoverPage && pageNumber > 0) {
    doc.switchToPage(pageNumber - 1);
    doc.fontSize(9).fillColor(colors.mutedText)
      .text(`Page ${pageNumber}`, 0, doc.page.height - 35, { align: 'center', width: doc.page.width });
    doc.fontSize(8).fillColor(colors.mutedText)
      .text('lekalu.web.app', 0, doc.page.height - 25, { align: 'center', width: doc.page.width });
  }

  doc.addPage();
  pageNumber++;
  isCoverPage = false;
  currentY = 50;

  // Header bar
  doc.rect(0, 0, doc.page.width, 6).fill(colors.primary);

  // Footer
  doc.moveTo(50, doc.page.height - 45).lineTo(doc.page.width - 50, doc.page.height - 45).stroke(colors.lightBg);
}

function addSpacer(height = 15) {
  currentY += height;
  doc.y = currentY;
}

function addHeading(text, level = 1) {
  checkPageBreak(40);

  if (level === 1) {
    const sectionMatch = text.match(/^(\d+)\.\s*(.+)/);
    if (sectionMatch) {
      const num = sectionMatch[1];
      const title = sectionMatch[2];

      // Number badge
      doc.roundedRect(50, currentY, 32, 32, 8).fill(colors.primary);
      doc.fontSize(18).fillColor(colors.white).text(num, 50, currentY + 6, { align: 'center', width: 32 });

      // Title
      doc.fontSize(22).fillColor(colors.primary).text(title, 95, currentY + 6);
      currentY += 42;
      doc.y = currentY;
      return;
    }
  } else if (level === 2) {
    doc.rect(50, currentY, 4, 22).fill(colors.accent);
    doc.fontSize(15).fillColor(colors.secondary).text(text, 62, currentY + 3);
    currentY += 30;
    doc.y = currentY;
  } else if (level === 3) {
    doc.fontSize(13).fillColor(colors.text).text(text, 50, currentY);
    currentY += 22;
    doc.y = currentY;
  } else {
    doc.fontSize(11).fillColor(colors.lightText).text(text, 50, currentY);
    currentY += 18;
    doc.y = currentY;
  }
}

function addParagraph(text, options = {}) {
  const fontSize = options.fontSize || 10;
  checkPageBreak(fontSize * 3);

  doc.fontSize(fontSize).fillColor(colors.text);
  doc.text(text, 50, currentY, { width: doc.page.width - 100, lineGap: 2 });
  currentY = doc.y + 8;
  doc.y = currentY;
}

function addBullet(text, options = {}) {
  const level = options.level || 0;
  const iconColor = options.iconColor || colors.accent;

  checkPageBreak(16);
  const indent = level * 15;
  const bulletX = 60 + indent;
  const textX = bulletX + 15;

  doc.fontSize(8).fillColor(iconColor).text('●', bulletX, currentY + 2);
  doc.fontSize(10).fillColor(colors.text).text(text, textX, currentY, { width: doc.page.width - textX - 50 });

  currentY += 16;
  doc.y = currentY;
}

function addNumberedItem(num, text) {
  checkPageBreak(20);

  const textX = 85;

  // Number circle
  doc.circle(68, currentY, 11).fill(colors.primary);
  doc.fontSize(10).fillColor(colors.white).text(String(num), 64, currentY - 4);

  doc.fontSize(10).fillColor(colors.text).text(text, textX, currentY, { width: doc.page.width - textX - 50 });

  currentY += 20;
  doc.y = currentY;
}

function addTipBox(title, text) {
  checkPageBreak(55);
  const boxHeight = 42;

  doc.roundedRect(50, currentY, doc.page.width - 100, boxHeight, 6)
    .fill('#ecfdf5');
  doc.rect(50, currentY, 4, boxHeight).fill(colors.success);
  doc.fontSize(12).fillColor(colors.success).text('💡', 62, currentY + 12);
  doc.fontSize(10).fillColor(colors.success).text(title, 90, currentY + 10);
  doc.fontSize(9).fillColor(colors.text).text(text, 90, currentY + 26, { width: doc.page.width - 160 });

  currentY += boxHeight + 10;
  doc.y = currentY;
}

function addWarningBox(title, text) {
  checkPageBreak(55);
  const boxHeight = 42;

  doc.roundedRect(50, currentY, doc.page.width - 100, boxHeight, 6)
    .fill('#fffbeb');
  doc.rect(50, currentY, 4, boxHeight).fill(colors.warning);
  doc.fontSize(12).fillColor(colors.warning).text('⚠️', 62, currentY + 12);
  doc.fontSize(10).fillColor(colors.warning).text(title, 90, currentY + 10);
  doc.fontSize(9).fillColor(colors.text).text(text, 90, currentY + 26, { width: doc.page.width - 160 });

  currentY += boxHeight + 10;
  doc.y = currentY;
}

function addInfoBox(title, text) {
  checkPageBreak(55);
  const boxHeight = 42;

  doc.roundedRect(50, currentY, doc.page.width - 100, boxHeight, 6)
    .fill('#eff6ff');
  doc.rect(50, currentY, 4, boxHeight).fill(colors.secondary);
  doc.fontSize(12).fillColor(colors.secondary).text('ℹ️', 62, currentY + 12);
  doc.fontSize(10).fillColor(colors.secondary).text(title, 90, currentY + 10);
  doc.fontSize(9).fillColor(colors.text).text(text, 90, currentY + 26, { width: doc.page.width - 160 });

  currentY += boxHeight + 10;
  doc.y = currentY;
}

function addTable(headers, rows) {
  const colCount = headers.length;
  const colWidth = (doc.page.width - 100) / colCount;
  const headerHeight = 26;
  const rowHeight = 22;

  checkPageBreak(headerHeight + (rows.length * rowHeight) + 15);

  // Header
  const headerY = currentY;
  doc.roundedRect(50, headerY, doc.page.width - 100, headerHeight, 3)
    .fill(colors.primary);

  headers.forEach((header, i) => {
    doc.fontSize(9).fillColor(colors.white).text(header, 55 + i * colWidth, headerY + 8, { width: colWidth - 10 });
  });

  currentY = headerY + headerHeight;

  // Rows
  rows.forEach((row, rowIndex) => {
    const rowY = currentY;
    const bgColor = rowIndex % 2 === 0 ? colors.white : colors.lightBg;

    doc.roundedRect(50, rowY, doc.page.width - 100, rowHeight, 1)
      .fill(bgColor);

    doc.moveTo(50, rowY + rowHeight).lineTo(doc.page.width - 50, rowY + rowHeight).stroke('#e5e7eb');

    row.forEach((cell, i) => {
      doc.fontSize(9).fillColor(colors.text).text(cell, 55 + i * colWidth, rowY + 6, { width: colWidth - 10 });
    });

    currentY = rowY + rowHeight;
  });

  addSpacer(12);
}

function addDivider() {
  doc.moveTo(50, currentY).lineTo(doc.page.width - 50, currentY).stroke(colors.lightBg);
  addSpacer(12);
}

// Render markdown
function renderMarkdown(content) {
  const lines = content.split('\n');
  let inCodeBlock = false;
  let listCounter = 0;
  let lastWasEmpty = true;

  // ========== COVER PAGE ==========
  // Dark background
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(colors.darkBg);

  // Decorative circles
  doc.circle(80, 80, 120).fill('#1e3a5f');
  doc.circle(doc.page.width - 60, doc.page.height - 80, 180).fill('#1e3a5f');

  // Logo area
  doc.roundedRect(doc.page.width/2 - 70, 100, 140, 140, 25).fill(colors.white);
  doc.fontSize(10).fillColor(colors.lightText).text('LOGO', doc.page.width/2 - 20, 155);

  // App name
  doc.fontSize(48).fillColor(colors.white).text('LEKALU', 0, 270, { align: 'center', width: doc.page.width });

  // Tagline
  doc.fontSize(16).fillColor(colors.accent).text('Your Personal Finance Companion', 0, 330, { align: 'center', width: doc.page.width });

  // Line
  doc.moveTo(doc.page.width/2 - 80, 360).lineTo(doc.page.width/2 + 80, 360).stroke(colors.accent);

  // Subtitle
  doc.fontSize(12).fillColor(colors.mutedText).text('Complete User Manual', 0, 380, { align: 'center', width: doc.page.width });

  // Version
  doc.fontSize(10).fillColor(colors.mutedText).text('Version 1.0 | April 2026', 0, 500, { align: 'center', width: doc.page.width });
  doc.fontSize(11).fillColor(colors.accent).text('lekalu.web.app', 0, 520, { align: 'center', width: doc.page.width });

  // ========== CONTENT ==========
  addNewPage();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('[//]')) continue;

    // Code blocks
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      checkPageBreak(14);
      doc.fontSize(8).fillColor(colors.lightText).text(line, 70, currentY);
      currentY = doc.y + 4;
      doc.y = currentY;
      continue;
    }

    // HR
    if (line.match(/^---+$/)) {
      addDivider();
      lastWasEmpty = true;
      continue;
    }

    // Skip title line
    if (line.startsWith('# Lekalu User Manual')) continue;

    // H2 - Major sections
    if (line.startsWith('## ')) {
      addSpacer(15);
      addHeading(line.replace(/^##\s*/, ''), 1);
      addSpacer(5);
      lastWasEmpty = false;
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      addSpacer(10);
      addHeading(line.replace(/^###\s*/, ''), 2);
      addSpacer(3);
      lastWasEmpty = false;
      continue;
    }

    // H4
    if (line.startsWith('#### ')) {
      addSpacer(8);
      addHeading(line.replace(/^####\s*/, ''), 3);
      lastWasEmpty = false;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      if (!lastWasEmpty) addSpacer(5);
      lastWasEmpty = true;
      listCounter = 0;
      continue;
    }

    // Bullets
    if (line.match(/^[-*]\s/)) {
      const text = line.replace(/^[-*]\s*/, '');
      listCounter = 0;

      const match = text.match(/^#+\s(.+)/);
      if (match) {
        addBullet(match[1], 1);
      } else {
        const boldMatch = text.match(/^\*\*(.+?)\*\*\s*(.*)/);
        if (boldMatch) {
          addBullet(`${boldMatch[1]} ${boldMatch[2]}`, { iconColor: colors.accent });
        } else {
          addBullet(text);
        }
      }
      lastWasEmpty = false;
      continue;
    }

    // Numbered
    if (line.match(/^\d+\.\s/)) {
      const text = line.replace(/^\d+\.\s*/, '');
      addNumberedItem(listCounter + 1, text);
      listCounter++;
      lastWasEmpty = false;
      continue;
    }

    // Tables
    if (line.startsWith('|')) {
      if (line.match(/^\|[-:\s|]+\|$/)) continue;

      const tableData = [];
      let j = i;
      while (j < lines.length && lines[j].startsWith('|')) {
        const row = lines[j].split('|').filter(c => c.trim() !== '' && !c.match(/^[-:\s]+$/));
        if (row.length > 0) tableData.push(row);
        j++;
      }
      if (tableData.length >= 2) {
        addTable(tableData[0], tableData.slice(1));
        i = j - 1;
      }
      continue;
    }

    // Paragraphs
    let cleanText = line
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    if (cleanText.trim()) {
      if (cleanText.includes('**Tip:') || cleanText.startsWith('Tip:')) {
        const tipText = cleanText.replace(/^\*\*Tip:\*\*\s*/, '').replace(/^Tip:\s*/, '');
        addTipBox('Tip', tipText);
      } else if (cleanText.includes('**Important:') || cleanText.startsWith('Important:')) {
        const warnText = cleanText.replace(/^\*\*Important:\*\*\s*/, '').replace(/^Important:\s*/, '');
        addWarningBox('Important', warnText);
      } else if (cleanText.includes('**Note:') || cleanText.startsWith('Note:')) {
        const noteText = cleanText.replace(/^\*\*Note:\*\*\s*/, '').replace(/^Note:\s*/, '');
        addInfoBox('Note', noteText);
      } else if (cleanText.match(/^\*\*Example \d+:?\*\*?/i)) {
        addSpacer(5);
        doc.fontSize(11).fillColor(colors.purple).text(cleanText.replace(/\*\*/g, ''), 50, currentY);
        currentY = doc.y + 8;
        doc.y = currentY;
      } else {
        addParagraph(cleanText);
      }
      lastWasEmpty = false;
    }
  }

  // ========== THANK YOU PAGE ==========
  addNewPage();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(colors.darkBg);
  doc.circle(100, 100, 150).fill('#1e3a5f');
  doc.circle(doc.page.width - 80, doc.page.height - 80, 200).fill('#1e3a5f');

  doc.fontSize(32).fillColor(colors.white).text('Thank You!', 0, 180, { align: 'center', width: doc.page.width });
  doc.fontSize(14).fillColor(colors.accent).text('for choosing Lekalu', 0, 225, { align: 'center', width: doc.page.width });

  doc.moveTo(doc.page.width/2 - 80, 260).lineTo(doc.page.width/2 + 80, 260).stroke(colors.accent);

  doc.fontSize(11).fillColor(colors.mutedText).text('Happy Tracking! 🎉', 0, 285, { align: 'center', width: doc.page.width });

  doc.fontSize(10).fillColor(colors.mutedText).text('Questions? Visit lekalu.web.app', 0, 340, { align: 'center', width: doc.page.width });

  doc.fontSize(8).fillColor(colors.lightText).text('© 2026 Lekalu. All rights reserved.', 0, doc.page.height - 50, { align: 'center', width: doc.page.width });
}

// Generate
try {
  renderMarkdown(markdownContent);

  doc.end();

  doc.on('end', () => {
    setTimeout(() => {
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        console.log(`PDF generated: ${outputPath}`);
        console.log(`Size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`Pages: ${pageNumber + 1}`);
      }
    }, 100);
  });

  doc.on('error', (err) => {
    console.error('PDF error:', err);
  });

} catch (error) {
  console.error('Error:', error);
  console.error(error.stack);
  process.exit(1);
}
