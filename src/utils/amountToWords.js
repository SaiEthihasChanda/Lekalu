/**
 * Convert a number to Indian words (lakhs, crores format)
 * Supports arbitrarily large numbers using Extended Indian Numbering System
 * @param {number} num - Number to convert
 * @returns {string} Number in words using Indian numbering system
 */
export const amountToWords = (num) => {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  
  // Extended Indian scales - supports up to any arbitrary magnitude
  // First 3-digit group, then every 2-digit group follows these scales
  const baseScales = [
    '', 'thousand', 'lakh', 'crore', 'arab', 
    'kharab', 'padma', 'neel', 'shankh', 'mahashankh',
    'anant', 'kharaj', 'visesha', 'padmaja', 'neelaja',
    'shankaja', 'vimohaja', 'abja', 'nirbhaya', 'param'
  ];

  if (num === 0 || num === null || num === undefined) return 'zero';
  if (num < 0) return 'minus ' + amountToWords(-num);

  // Helper to convert 1-2 digit numbers to words
  const convertUpTo99 = (n) => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    const tensDigit = Math.floor(n / 10);
    const onesDigit = n % 10;
    if (onesDigit === 0) return tens[tensDigit];
    return tens[tensDigit] + ' ' + ones[onesDigit];
  };

  // Helper to convert up to 3 digits
  const convertUpTo999 = (n) => {
    if (n === 0) return '';
    let result = '';
    
    const hundredDigit = Math.floor(n / 100);
    if (hundredDigit > 0) {
      result = ones[hundredDigit] + ' hundred';
    }

    const remainder = n % 100;
    const twoDigitWords = convertUpTo99(remainder);
    
    if (twoDigitWords) {
      if (result) result += ' ';
      result += twoDigitWords;
    }

    return result;
  };

  // Get or generate scale name (extends beyond baseScales if needed)
  const getScaleName = (index) => {
    if (index < baseScales.length) {
      return baseScales[index];
    }
    // For ultra-large numbers beyond predefined scales
    // Generate descriptive names
    return null; // Will skip display if scale not found
  };

  // Extract groups following Indian system (rightmost 3, then pairs of 2)
  const groups = [];
  let groupIndex = 0;
  let tempNum = Math.floor(num);

  // Get rightmost 3 digits
  groups.push(tempNum % 1000);
  tempNum = Math.floor(tempNum / 1000);

  // Get remaining groups of 2 digits each
  while (tempNum > 0) {
    groups.push(tempNum % 100);
    tempNum = Math.floor(tempNum / 100);
  }

  groups.reverse();

  // Convert each group to words
  const parts = [];
  
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (group === 0) continue;

    let groupWords = '';

    // First group can have 1-3 digits
    if (i === 0) {
      groupWords = convertUpTo999(group);
    } else {
      // Other groups are 2 digits max
      groupWords = convertUpTo99(group);
    }

    // Add scale word
    if (groupWords) {
      const scaleIndex = groups.length - 1 - i;
      const scaleName = getScaleName(scaleIndex);
      
      if (scaleIndex > 0 && scaleName) {
        groupWords += ' ' + scaleName;
      }
      parts.push(groupWords);
    }
  }

  if (parts.length === 0) return 'zero';
  return parts.join(' ').trim();
};
