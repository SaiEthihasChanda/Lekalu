// Types for the Expense Tracking App
// Note: JavaScript version - types are documented in comments

/**
 * @typedef {Object} BankAccount
 * @property {string} id
 * @property {string} cardName
 * @property {string} accountNumber
 * @property {number} createdAt
 */

/**
 * @typedef {Object} Trackable
 * @property {string} id
 * @property {string} name
 * @property {string} accountId
 * @property {'income' | 'expense'} type
 * @property {boolean} includeInTracker
 * @property {number} [trackerAmount]
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * @typedef {Object} Activity
 * @property {string} id
 * @property {number} amount
 * @property {'income' | 'expense' | 'transfer'} type
 * @property {string} [trackableId]
 * @property {string} accountId
 * @property {string} description
 * @property {number} date
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * @typedef {Object} Tracker
 * @property {string} id
 * @property {string} trackableId
 * @property {number} month
 * @property {number} year
 * @property {boolean} isDone
 * @property {number} [completedAt]
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * @typedef {Object} AnalyticsFilter
 * @property {'today' | 'week' | 'month' | 'year' | 'custom'} timeRange
 * @property {number} [startDate]
 * @property {number} [endDate]
 * @property {string} [accountId]
 * @property {string} [trackableId]
 */

/**
 * @typedef {Object} AnalyticsSummary
 * @property {number} totalIncome
 * @property {number} totalExpense
 * @property {number} netFlow
 * @property {Object.<string, number>} byCategory
 * @property {Object.<string, { income: number; expense: number }>} byAccount
 */

export {};
