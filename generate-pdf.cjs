const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Read the markdown file
const markdownPath = path.join(__dirname, 'FEATURES.md');
const markdownContent = fs.readFileSync(markdownPath, 'utf8');

// Create PDF document
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  info: {
    Title: 'Lekalu - Complete Feature Documentation',
    Author: 'Lekalu',
    Subject: 'Feature Documentation',
    CreationDate: new Date()
  }
});

// Pipe to file
const outputPath = path.join(__dirname, 'LEKALU_FEATURES.pdf');
doc.pipe(fs.createWriteStream(outputPath));

// Colors
const colors = {
  primary: '#1e40af',
  secondary: '#3b82f6',
  text: '#1f2937',
  lightText: '#6b7280',
  accent: '#0ea5e9',
  white: '#ffffff'
};

// Helper function to add page if needed
function checkPageBreak(requiredSpace) {
  if (doc.y + requiredSpace > doc.page.height - 50) {
    doc.addPage();
    doc.y = 50;
  }
}

// Helper to add heading
function addHeading(text, level = 1) {
  checkPageBreak(40);

  let fontSize, color;
  if (level === 1) {
    fontSize = 24;
    color = colors.primary;
    doc.y += 10;
  } else if (level === 2) {
    fontSize = 18;
    color = colors.secondary;
    doc.y += 5;
  } else if (level === 3) {
    fontSize = 14;
    color = colors.text;
  } else {
    fontSize = 12;
    color = colors.text;
  }

  doc.fontSize(fontSize).fillColor(color).text(text, { align: 'left' });
}

// Helper to add paragraph
function addParagraph(text, options = {}) {
  const fontSize = options.fontSize || 10;
  const indent = options.indent || 0;

  checkPageBreak(fontSize * 2);

  doc.fontSize(fontSize).fillColor(colors.text);

  const textOptions = {
    align: 'left',
    indent: indent,
    lineGap: 2
  };

  doc.text(text, 50, doc.y, { width: doc.page.width - 100, ...textOptions });
  doc.y = doc.y + 10;
}

// Helper to add bullet point
function addBullet(text, level = 0) {
  checkPageBreak(15);

  const indent = level * 20 + 50;
  doc.fontSize(10).fillColor(colors.text);
  doc.text('•  ' + text, indent, doc.y, { width: doc.page.width - indent - 50 });
  doc.y = doc.y + 8;
}

// Helper to add numbered list item
let listCounter = 1;
function addNumberedItem(text, reset = false) {
  if (reset) listCounter = 1;
  checkPageBreak(15);

  doc.fontSize(10).fillColor(colors.text);
  doc.text(`${listCounter}.  ${text}`, 50, doc.y, { width: doc.page.width - 100 });
  doc.y = doc.y + 8;
  listCounter++;
}

// Parse and render markdown content
function renderMarkdown(content) {
  const lines = content.split('\n');
  let inCodeBlock = false;
  let inList = false;
  let listType = null;

  // Title page
  doc.fontSize(36).fillColor(colors.primary).text('LEKALU', { align: 'center' });
  doc.y += 20;
  doc.fontSize(20).fillColor(colors.secondary).text('Complete Feature Documentation', { align: 'center' });
  doc.y += 30;
  doc.fontSize(12).fillColor(colors.lightText).text('Version 1.0 | April 2026', { align: 'center' });
  doc.addPage();
  doc.y = 50;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip the title and table of contents from markdown (we'll create our own)
    if (line.startsWith('# Lekalu - Complete Feature')) continue;
    if (line.startsWith('## Table of Contents')) {
      // Skip TOC in markdown, we'll handle page breaks naturally
      continue;
    }

    // Code blocks
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (inCodeBlock) {
        doc.y += 10;
      }
      continue;
    }

    if (inCodeBlock) {
      doc.fontSize(8).fillColor(colors.lightText).text(line, 60, doc.y);
      doc.y = doc.y + 4;
          continue;
    }

    // Headings
    if (line.startsWith('####')) {
      addHeading(line.replace(/^####\s*/, ''), 4);
    } else if (line.startsWith('###')) {
      addHeading(line.replace(/^###\s*/, ''), 3);
    } else if (line.startsWith('##')) {
      // Add page break before major sections
      if (doc.y > 100) {
        doc.addPage();
        doc.y = 50;
      }
      addHeading(line.replace(/^##\s*/, ''), 2);
    } else if (line.startsWith('#')) {
      addHeading(line.replace(/^#\s*/, ''), 1);
    }
    // Horizontal rule
    else if (line.match(/^---+$/)) {
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke('#e5e7eb');
      doc.y += 20;
        }
    // Empty line
    else if (line.trim() === '') {
      doc.y += 5;
          inList = false;
      listCounter = 1;
    }
    // Bullet list
    else if (line.match(/^[-*]\s/)) {
      const text = line.replace(/^[-*]\s/, '');
      // Check for nested items
      const match = text.match(/^(#+)\s/);
      if (match) {
        const level = match[1].length;
        addBullet(text.replace(/^#+\s/, ''), level);
      } else {
        addBullet(text);
      }
      inList = true;
    }
    // Numbered list
    else if (line.match(/^\d+\.\s/)) {
      if (!inList || listType !== 'numbered') {
        listCounter = 1;
        listType = 'numbered';
      }
      const text = line.replace(/^\d+\.\s/, '');
      addNumberedItem(text);
      inList = true;
    }
    // Regular paragraph
    else {
      // Clean up markdown formatting
      let cleanText = line
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
        .replace(/\*([^*]+)\*/g, '$1') // Italic
        .replace(/`([^`]+)`/g, '$1') // Inline code
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
        .replace(/^_+/, '') // Italic underscores at start
        .replace(/_+$/, ''); // Italic underscores at end

      if (cleanText.trim()) {
        addParagraph(cleanText);
      }
      inList = false;
      listCounter = 1;
    }
  }
}

// Generate the PDF
try {
  renderMarkdown(markdownContent);

  // Add footer to all pages
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor(colors.lightText)
      .text(
        `Lekalu Feature Documentation | Page ${i + 1}`,
        50,
        doc.page.height - 30,
        { align: 'center', width: doc.page.width - 100 }
      );
  }

  // Finalize the PDF
  doc.end();

  // Wait for the stream to finish
  doc.on('end', () => {
    setTimeout(() => {
      if (fs.existsSync(outputPath)) {
        console.log(`PDF generated successfully: ${outputPath}`);
        console.log(`File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
      } else {
        console.error('PDF file was not created');
      }
    }, 100);
  });

  doc.on('error', (err) => {
    console.error('PDF stream error:', err);
  });

} catch (error) {
  console.error('Error generating PDF:', error);
  process.exit(1);
}
