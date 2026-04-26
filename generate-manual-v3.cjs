const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, 'public', 'lekalu-logo.png');
const logoBuffer = fs.readFileSync(logoPath);

const markdownPath = path.join(__dirname, 'USER_MANUAL.md');
const markdownContent = fs.readFileSync(markdownPath, 'utf8');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 }
});

const outputPath = path.join(__dirname, 'LEKALU_USER_MANUAL.pdf');
doc.pipe(fs.createWriteStream(outputPath));

const colors = {
  primary: '#1e40af',
  secondary: '#3b82f6',
  accent: '#0ea5e9',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  text: '#1f2937',
  lightText: '#6b7280',
  mutedText: '#9ca3af',
  white: '#ffffff',
  lightBg: '#f8fafc',
  darkBg: '#0f172a'
};

let currentY = 50;
let pageNum = 0;

function needSpace(h = 30) {
  if (currentY + h > doc.page.height - 50) {
    doc.addPage();
    currentY = 50;
    drawHeader();
    pageNum++;
  }
}

function drawHeader() {
  doc.rect(0, 0, doc.page.width, 4).fill(colors.primary);
  doc.fontSize(7).fillColor(colors.mutedText);
  doc.text('LEKALU USER MANUAL', 50, doc.page.height - 38);
  doc.text(`Page ${pageNum + 1}`, doc.page.width - 80, doc.page.height - 38);
  doc.moveTo(50, doc.page.height - 48).lineTo(doc.page.width - 50, doc.page.height - 48).stroke(colors.lightBg);
}

function spacer(h = 10) {
  currentY += h;
  doc.y = currentY;
}

function h1(text) {
  needSpace(40);
  const m = text.match(/^(\d+)\.\s*(.+)/);
  if (m) {
    doc.roundedRect(50, currentY, 28, 28, 5).fill(colors.primary);
    doc.fontSize(14).fillColor(colors.white).text(m[1], 50, currentY + 6, { align: 'center', width: 28 });
    doc.fontSize(18).fillColor(colors.primary).text(m[2], 88, currentY + 5);
    currentY += 38;
    doc.y = currentY;
  }
}

function h2(text) {
  needSpace(30);
  doc.rect(50, currentY, 3, 18).fill(colors.accent);
  doc.fontSize(13).fillColor(colors.secondary).text(text, 60, currentY + 1);
  currentY += 26;
  doc.y = currentY;
}

function h3(text) {
  needSpace(22);
  doc.fontSize(11).fillColor(colors.text).text(text, 50, currentY);
  currentY += 20;
  doc.y = currentY;
}

function p(text) {
  needSpace(22);
  doc.fontSize(9.5).fillColor(colors.text).text(text, 50, currentY, { width: doc.page.width - 100, lineGap: 2 });
  currentY = doc.y + 8;
  doc.y = currentY;
}

function bullet(text, lvl = 0) {
  needSpace(16);
  const x = 60 + lvl * 15;
  doc.fontSize(7).fillColor(colors.accent).text('●', x, currentY + 3);
  doc.fontSize(9.5).fillColor(colors.text).text(text, x + 10, currentY, { width: doc.page.width - x - 60 });
  currentY += 14;
  doc.y = currentY;
}

function numbered(n, text) {
  needSpace(18);
  doc.circle(63, currentY, 8).fill(colors.primary);
  doc.fontSize(8).fillColor(colors.white).text(String(n), 60, currentY - 2.5);
  doc.fontSize(9.5).fillColor(colors.text).text(text, 78, currentY, { width: doc.page.width - 135 });
  currentY += 16;
  doc.y = currentY;
}

function tipbox(title, text) {
  needSpace(48);
  doc.roundedRect(50, currentY, doc.page.width - 100, 36, 4).fill('#ecfdf5');
  doc.rect(50, currentY, 3, 36).fill(colors.success);
  doc.fontSize(11).text('💡', 58, currentY + 9);
  doc.fontSize(9).fillColor(colors.success).text(title, 76, currentY + 10);
  doc.fontSize(8.5).fillColor(colors.text).text(text, 76, currentY + 24, { width: doc.page.width - 145 });
  currentY += 42;
  doc.y = currentY;
}

function warnbox(title, text) {
  needSpace(48);
  doc.roundedRect(50, currentY, doc.page.width - 100, 36, 4).fill('#fffbeb');
  doc.rect(50, currentY, 3, 36).fill(colors.warning);
  doc.fontSize(11).text('⚠️', 58, currentY + 9);
  doc.fontSize(9).fillColor(colors.warning).text(title, 76, currentY + 10);
  doc.fontSize(8.5).fillColor(colors.text).text(text, 76, currentY + 24, { width: doc.page.width - 145 });
  currentY += 42;
  doc.y = currentY;
}

function infobox(title, text) {
  needSpace(48);
  doc.roundedRect(50, currentY, doc.page.width - 100, 36, 4).fill('#eff6ff');
  doc.rect(50, currentY, 3, 36).fill(colors.secondary);
  doc.fontSize(11).text('ℹ️', 58, currentY + 9);
  doc.fontSize(9).fillColor(colors.secondary).text(title, 76, currentY + 10);
  doc.fontSize(8.5).fillColor(colors.text).text(text, 76, currentY + 24, { width: doc.page.width - 145 });
  currentY += 42;
  doc.y = currentY;
}

function table(headers, rows) {
  const cols = headers.length;
  const w = (doc.page.width - 100) / cols;
  const hh = 22, rh = 18;
  needSpace(hh + rows.length * rh + 15);

  const hy = currentY;
  doc.roundedRect(50, hy, doc.page.width - 100, hh, 2).fill(colors.primary);
  headers.forEach((h, i) => {
    doc.fontSize(8).fillColor(colors.white).text(h, 54 + i * w, hy + 6, { width: w - 8 });
  });
  currentY = hy + hh;

  rows.forEach((row, ri) => {
    const ry = currentY;
    doc.roundedRect(50, ry, doc.page.width - 100, rh, 1).fill(ri % 2 === 0 ? colors.white : colors.lightBg);
    row.forEach((cell, ci) => {
      doc.fontSize(8).fillColor(colors.text).text(cell, 54 + ci * w, ry + 4, { width: w - 8 });
    });
    currentY = ry + rh;
  });
  spacer(8);
}

function divider() {
  doc.moveTo(50, currentY).lineTo(doc.page.width - 50, currentY).stroke(colors.lightBg);
  spacer(8);
}

// ========== COVER PAGE ==========
doc.rect(0, 0, doc.page.width, doc.page.height).fill(colors.darkBg);
doc.circle(60, 60, 110).fill('#1e3a5f');
doc.circle(doc.page.width - 40, doc.page.height - 40, 170).fill('#1e3a5f');

// Logo
doc.image(logoBuffer, doc.page.width/2 - 50, 80, { width: 100 });

doc.fontSize(44).fillColor(colors.white).text('LEKALU', 0, 240, { align: 'center', width: doc.page.width });
doc.fontSize(14).fillColor(colors.accent).text('Your Personal Finance Companion', 0, 295, { align: 'center', width: doc.page.width });
doc.moveTo(doc.page.width/2 - 60, 320).lineTo(doc.page.width/2 + 60, 320).stroke(colors.accent);
doc.fontSize(10).fillColor(colors.mutedText).text('Complete User Manual', 0, 338, { align: 'center', width: doc.page.width });
doc.fontSize(9).fillColor(colors.mutedText).text('Version 1.0 | April 2026', 0, 480, { align: 'center', width: doc.page.width });
doc.fontSize(11).fillColor(colors.accent).text('lekalu.web.app', 0, 498, { align: 'center', width: doc.page.width });

// ========== CONTENT ==========
doc.addPage();
pageNum = 1;
currentY = 50;
drawHeader();

const lines = markdownContent.split('\n');
let inCode = false;
let counter = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.startsWith('[//]')) continue;

  if (line.startsWith('```')) {
    inCode = !inCode;
    continue;
  }
  if (inCode) {
    needSpace(12);
    doc.fontSize(7).fillColor(colors.lightText).text(line, 60, currentY);
    currentY += 10;
    doc.y = currentY;
    continue;
  }

  if (line.match(/^---+$/)) { divider(); continue; }
  if (line.startsWith('# Lekalu User Manual')) continue;
  if (line.startsWith('## ')) { spacer(12); h1(line.slice(3)); spacer(4); continue; }
  if (line.startsWith('### ')) { spacer(6); h2(line.slice(4)); spacer(2); continue; }
  if (line.startsWith('#### ')) { spacer(5); h3(line.slice(5)); continue; }

  if (line.trim() === '') {
    if (counter > 0) spacer(4);
    counter = 0;
    continue;
  }

  if (line.match(/^[-*]\s/)) {
    const t = line.replace(/^[-*]\s*/, '');
    counter = 0;
    const bold = t.match(/^\*\*(.+?)\*\*\s*(.*)/);
    if (bold) bullet(`${bold[1]} ${bold[2]}`, 0);
    else bullet(t);
    continue;
  }

  if (line.match(/^\d+\.\s/)) {
    const t = line.replace(/^\d+\.\s*/, '');
    numbered(++counter, t);
    continue;
  }

  if (line.startsWith('|')) {
    if (line.match(/^\|[-:\s|]+\|$/)) continue;
    const tbl = [];
    let j = i;
    while (j < lines.length && lines[j].startsWith('|')) {
      const r = lines[j].split('|').filter(c => c.trim() !== '' && !c.match(/^[-:\s]+$/));
      if (r.length) tbl.push(r);
      j++;
    }
    if (tbl.length >= 2) {
      table(tbl[0], tbl.slice(1));
      i = j - 1;
    }
    continue;
  }

  let t = line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`(.+?)`/g, '$1').replace(/\[(.+?)\]\(.+?\)/g, '$1');

  if (t.includes('**Tip:') || t.startsWith('Tip:')) tipbox('Tip', t.replace(/^\*\*Tip:\*\*\s*/, '').replace(/^Tip:\s*/, ''));
  else if (t.includes('**Important:') || t.startsWith('Important:')) warnbox('Important', t.replace(/^\*\*Important:\*\*\s*/, '').replace(/^Important:\s*/, ''));
  else if (t.includes('**Note:') || t.startsWith('Note:')) infobox('Note', t.replace(/^\*\*Note:\*\*\s*/, '').replace(/^Note:\s*/, ''));
  else if (t.match(/^\*\*Example \d+/i)) {
    spacer(4);
    doc.fontSize(10).fillColor(colors.purple).text(t.replace(/\*\*/g, ''), 50, currentY);
    currentY += 16;
    doc.y = currentY;
  }
  else p(t);
}

// ========== THANK YOU PAGE ==========
doc.addPage();
doc.rect(0, 0, doc.page.width, doc.page.height).fill(colors.darkBg);
doc.circle(70, 70, 120).fill('#1e3a5f');
doc.circle(doc.page.width - 50, doc.page.height - 50, 160).fill('#1e3a5f');

doc.fontSize(28).fillColor(colors.white).text('Thank You!', 0, 160, { align: 'center', width: doc.page.width });
doc.fontSize(12).fillColor(colors.accent).text('for choosing Lekalu', 0, 200, { align: 'center', width: doc.page.width });
doc.moveTo(doc.page.width/2 - 60, 230).lineTo(doc.page.width/2 + 60, 230).stroke(colors.accent);
doc.fontSize(10).fillColor(colors.mutedText).text('Happy Tracking! 🎉', 0, 255, { align: 'center', width: doc.page.width });
doc.fontSize(9).fillColor(colors.mutedText).text('Questions? Visit lekalu.web.app', 0, 310, { align: 'center', width: doc.page.width });
doc.fontSize(7).fillColor(colors.lightText).text('© 2026 Lekalu. All rights reserved.', 0, doc.page.height - 45, { align: 'center', width: doc.page.width });

doc.end();

doc.on('end', () => {
  setTimeout(() => {
    const s = fs.statSync(outputPath);
    console.log(`PDF generated: ${outputPath}`);
    console.log(`Size: ${(s.size / 1024).toFixed(2)} KB`);
  }, 100);
});
