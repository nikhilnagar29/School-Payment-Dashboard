/**
 * Generate a unique receipt number
 * Format: SCH-YYYY-XXXXX (where XXXXX is a random 5-digit number)
 * @returns {string} Receipt number
 */
const generateReceiptNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000); // 5-digit random number
  return `SCH-${year}-${random}`;
};

/**
 * Format currency amount
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (default: NGN)
 * @returns {string} Formatted amount
 */
const formatCurrency = (amount, currency = 'NGN') => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency
  }).format(amount);
};

/**
 * Calculate academic year based on current date
 * Academic year runs from September to August
 * @returns {string} Academic year in format '2023/2024'
 */
const getCurrentAcademicYear = () => {
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
  const currentYear = today.getFullYear();
  
  // If current month is September or later, academic year is currentYear/currentYear+1
  // Otherwise it's currentYear-1/currentYear
  let startYear, endYear;
  
  if (currentMonth >= 9) { // September or later
    startYear = currentYear;
    endYear = currentYear + 1;
  } else {
    startYear = currentYear - 1;
    endYear = currentYear;
  }
  
  return `${startYear}/${endYear}`;
};

/**
 * Get current term based on date
 * Term 1: September - December
 * Term 2: January - March
 * Term 3: April - July
 * @returns {string} Current term (Term 1, Term 2, or Term 3)
 */
const getCurrentTerm = () => {
  const currentMonth = new Date().getMonth() + 1;
  
  if (currentMonth >= 9 && currentMonth <= 12) {
    return 'Term 1';
  } else if (currentMonth >= 1 && currentMonth <= 3) {
    return 'Term 2';
  } else {
    return 'Term 3';
  }
};

module.exports = {
  generateReceiptNumber,
  formatCurrency,
  getCurrentAcademicYear,
  getCurrentTerm
};

 