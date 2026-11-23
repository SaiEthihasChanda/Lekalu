/**
 * Bank-agnostic transaction SMS parser.
 *
 * Indian bank, card and UPI alerts differ in wording but share the same building blocks:
 * an amount with a currency marker, a debit/credit verb, a masked account or card number,
 * an optional reference number and an optional counterparty. Instead of per-bank templates
 * this parser extracts each block independently, so new banks and template changes keep
 * working as long as the building blocks are present.
 *
 * Runs entirely on the device; SMS text is never sent anywhere.
 */

const AMOUNT_NUMBER = '([0-9][0-9,]*(?:\\.[0-9]{1,2})?)';
const CURRENCY_AMOUNT = new RegExp(`(?:\\b(?:rs|inr)(?![a-z])\\.?|₹)\\s*${AMOUNT_NUMBER}`, 'gi');
// Amounts that follow a transaction verb without a currency marker, e.g. SBI "debited by 500.0"
const VERB_AMOUNT = new RegExp(
  `\\b(?:debited|credited|paid|spent|received|withdrawn|sent|deposited|transferred)\\s+(?:by|for|with|of|amt|amount)?\\s*${AMOUNT_NUMBER}\\b`,
  'i',
);
// Words that mark the amount right after them as a balance/limit, not the transaction amount
const BALANCE_CONTEXT = /(?:avl|avbl|available|avail|clear|closing|ledger|total|current|net|outstanding|o\/s)?\.?\s*(?:bal(?:ance)?|lmt|limit|due)\b[^0-9₹]{0,12}$/i;

const DEBIT_PATTERNS = [
  /\bdebited\b/i,
  /\bdebit(?:ed)?\s+(?:of|for)\b/i,
  /\bspent\b/i,
  /\bpaid\b/i,
  /\bsent\b/i,
  /\bwithdrawn\b/i,
  /\bwithdrawal\b/i,
  /\bpurchase\b/i,
  /\bdeducted\b/i,
  /\bcharged\b/i,
  /\btransferred\s+(?:from|to)\b/i,
  /\bused\s+(?:for|at)\b/i,
  /\btxn\s+of\b/i,
  /\bdr\b\.?/i,
];

const CREDIT_PATTERNS = [
  /\bcredited\b/i,
  /\breceived\b/i,
  /\bdeposited\b/i,
  /\badded\s+to\b/i,
  /\brefund(?:ed)?\b/i,
  /\brevers(?:ed|al)\b/i,
  /\bcashback\b.*\bcredited\b/i,
  /\bcr\b\.?/i,
];

const REFUND_PATTERN = /\b(?:refund(?:ed)?|revers(?:ed|al)|chargeback)\b/i;
const CARD_PAYMENT_PATTERN = /\bpayment\b.{0,40}\b(?:received|credited)\b.{0,60}\bcard\b|\b(?:received|credited)\b.{0,40}\bpayment\b.{0,60}\bcard\b|\bcard\b.{0,60}\bpayment\b.{0,40}\b(?:received|credited|successful)\b/i;

/** A completed money movement on the user's account/card, e.g. "debited from A/c XX1234". */
const COMPLETED_TXN = /\b(?:credited|debited|spent|paid|withdrawn|received|sent|deposited)\b.{0,80}\b(?:a\/?c|acct|account|card)\b|\b(?:a\/?c|acct|account|card)\b.{0,80}\b(?:credited|debited|spent|paid|withdrawn|received|sent|deposited)\b/i;

/** Ordered: the first matching rule decides why a message is ignored. */
const IGNORE_RULES = [
  { reason: 'otp', test: /\b(?:otp|one[\s-]?time\s+pass(?:word|code)?|verification\s+code|security\s+code|cvv)\b/i },
  { reason: 'collect-request', test: /\b(?:has\s+requested|requested\s+(?:money|rs|inr|₹)|collect\s+request|payment\s+request|requesting\s+payment)\b/i },
  {
    // Pre-debit and mandate notices announce a future debit; recording them would double-count
    reason: 'future-notice',
    test: /\b(?:will\s+be\s+(?:debited|deducted|charged|auto[\s-]?debited|processed|presented)|to\s+be\s+debited|pre[\s-]?debit|mandate\s+(?:is\s+)?(?:created|registered|set\s?up)|e-?mandate|si\s+registered|autopay\s+(?:is\s+)?(?:set|registered|activated)|scheduled\s+(?:for|on))\b/i,
  },
  {
    reason: 'statement',
    test: /\b(?:statement\s+(?:for|of|is|has)|minimum\s+(?:amount\s+)?due|total\s+(?:amount\s+)?due|bill\s+(?:is\s+)?generated|min\.?\s+amt\s+due)\b/i,
    unless: /\bpayment\b.{0,60}\b(?:received|credited)\b/i,
  },
  {
    reason: 'reminder',
    test: /\b(?:is\s+due|due\s+(?:on|by|date)|upcoming|reminder|pay\s+now)\b/i,
    unless: COMPLETED_TXN,
  },
  {
    reason: 'failed',
    test: /\b(?:failed|declined|unsuccessful|could\s+not\s+be\s+(?:processed|completed)|not\s+(?:been\s+)?processed|insufficient\s+(?:funds|balance)|rejected)\b/i,
    // "Rs 500 reversed to your a/c for failed txn" is a real credit, not a failure notice
    unless: /\b(?:revers(?:ed|al)|refund(?:ed)?)\b.{0,40}\b(?:credited|to\s+your|in\s+your)\b|\bcredited\b.{0,60}\b(?:revers|refund)/i,
  },
  {
    reason: 'promotion',
    test: /\b(?:offer|apply\s+now|pre[\s-]?approved|eligible\s+for|congratulations|win\b|click\s+(?:here|on)|t&c|limited\s+period|upgrade\s+your|loan\s+of|get\s+(?:upto|up\s+to|flat)|instant\s+loan|discount)\b/i,
    // A cashback actually credited, or a real spend with an ad tacked on, is still a transaction
    unless: COMPLETED_TXN,
  },
];

const ACCOUNT_PATTERN = /\b(a\/?c|acct|account|card|ac)(?:\b|(?=x+[0-9]))\.?\s*(?:no\.?|number|num)?\s*(?:ending|ending\s+(?:with|in)|ends\s+with)?\s*[:.#-]?\s*[x*.]*\s*([0-9]{3,6})\b/gi;
const MASKED_NUMBER = /(?:^|[^a-z0-9])(?:x{1,}|\*{1,})([0-9]{3,6})\b/gi;

const REF_PATTERNS = [
  /\bUPI\/[A-Z0-9]+\/([0-9]{9,})/i,
  /\b(?:upi\s*(?:ref(?:erence)?|txn|transaction|id)?|ref(?:erence)?|utr|rrn|txn|transaction|imps\s*ref)\s*(?:no|number|id)?\.?\s*[:#-]?\s*([a-z0-9]*[0-9][a-z0-9]{5,21})\b/i,
];

const VPA_PATTERN = /\b([a-z0-9][a-z0-9._-]{1,63}@[a-z][a-z0-9]{1,30})\b/i;
const COUNTERPARTY_PATTERN = /\b(?:at|to|towards|from|by|trf\s+to|info:?|for)\s+(?!(?:your|a\/?c|ac|acct|account|card|the|vpa|upi|rs|inr|bank|you|on|ref)\b)([a-z0-9&.'@_/ -]{2,40}?)(?=\s+(?:on|ref(?:no|\.)?|upi|avl|avbl|bal|via|for|not\s+you|is|was|has|dt|date|txn|thru|through|using)\b|\s*[.;,(]|\s*-\s|$)/i;

/** Words that, alone, are not a useful counterparty. */
const COUNTERPARTY_STOPWORDS = /^(?:a|an|the|your|you|self|bank|account|card|upi|neft|imps|rtgs|vpa|mobile|beneficiary|us|merchant|\d+)$/i;

const normalizeWhitespace = (text) => String(text || '').replace(/\s+/g, ' ').trim();

const toNumber = (raw) => {
  const value = Number.parseFloat(String(raw).replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
};

/**
 * Normalize an SMS sender ID so the same bank matches across operators and SIMs.
 * "VM-HDFCBK", "AD-HDFCBK-S", "JD-HDFCBK-T" all become "HDFCBK".
 * @param {string} sender
 * @returns {string}
 */
export const normalizeSender = (sender) => {
  const value = String(sender || '').trim().toUpperCase();
  const parts = value.split('-').filter(Boolean);
  if (parts.length >= 2 && /^[A-Z]{2}$/.test(parts[0])) {
    // Drop the operator/circle prefix and a trailing single-letter category (S/T/P/G)
    const rest = parts.slice(1);
    if (rest.length > 1 && /^[A-Z]$/.test(rest[rest.length - 1])) rest.pop();
    return rest.join('-');
  }
  return value;
};

/** True for a 10+ digit phone number sender (person-to-person SMS, not a bank). */
const isPhoneNumberSender = (sender) => /^\+?[0-9]{10,}$/.test(String(sender || '').replace(/[\s-]/g, ''));

const findFirstPattern = (patterns, text) => {
  let best = null;
  patterns.forEach((pattern) => {
    const match = pattern.exec(text);
    if (match && (best === null || match.index < best)) best = match.index;
  });
  return best;
};

/**
 * Pick the transaction amount: the first currency amount that is not a balance or limit.
 * @returns {{ amount: number, index: number } | null}
 */
const extractAmount = (text) => {
  CURRENCY_AMOUNT.lastIndex = 0;
  let match;
  while ((match = CURRENCY_AMOUNT.exec(text)) !== null) {
    const before = text.slice(Math.max(0, match.index - 30), match.index);
    if (BALANCE_CONTEXT.test(before)) continue;
    const amount = toNumber(match[1]);
    if (amount != null && amount > 0) return { amount, index: match.index };
  }
  const verbMatch = VERB_AMOUNT.exec(text);
  if (verbMatch) {
    const amount = toNumber(verbMatch[1]);
    if (amount != null && amount > 0) return { amount, index: verbMatch.index };
  }
  return null;
};

const extractAccount = (text) => {
  ACCOUNT_PATTERN.lastIndex = 0;
  let match;
  while ((match = ACCOUNT_PATTERN.exec(text)) !== null) {
    // Skip things like "account of Rs 500" where the digits are part of an amount
    const between = match[0].slice(match[1].length);
    if (/rs|inr|₹/i.test(between)) continue;
    const digits = match[2];
    return { account4: digits.slice(-4), accountType: /card/i.test(match[1]) ? 'card' : 'account' };
  }
  MASKED_NUMBER.lastIndex = 0;
  const masked = MASKED_NUMBER.exec(text);
  if (masked) {
    const accountType = /\bcard\b/i.test(text) && !/\b(?:a\/?c|acct|account)\b/i.test(text) ? 'card' : 'account';
    return { account4: masked[1].slice(-4), accountType };
  }
  return { account4: null, accountType: /\bcard\b/i.test(text) ? 'card' : null };
};

const extractReference = (text) => {
  for (const pattern of REF_PATTERNS) {
    const match = pattern.exec(text);
    if (match && /[0-9]{6,}/.test(match[1])) return match[1].toUpperCase();
  }
  return null;
};

const cleanCounterparty = (value) => {
  const cleaned = normalizeWhitespace(String(value || '').replace(/[.;,:-]+$/, ''));
  if (!cleaned || cleaned.length < 2 || COUNTERPARTY_STOPWORDS.test(cleaned)) return null;
  if (/^(?:x+|\*+)?[0-9.,/:-]+$/i.test(cleaned)) return null;
  return cleaned;
};

const extractCounterparty = (text) => {
  if (/\b(?:atm|cash\s+withdrawal|withdrawn\s+at)\b/i.test(text)) return 'ATM cash withdrawal';
  const vpa = VPA_PATTERN.exec(text);
  if (vpa) return vpa[1].toLowerCase();
  // ICICI style: "...debited for Rs 500 on 12-May-25; JOHN DOE credited."
  const credited = /;\s*([a-z][a-z0-9 .&'-]{1,40}?)\s+credited\b/i.exec(text);
  if (credited && cleanCounterparty(credited[1])) return cleanCounterparty(credited[1]);
  const pattern = new RegExp(COUNTERPARTY_PATTERN.source, 'gi');
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const value = cleanCounterparty(match[1]);
    if (value) return value;
  }
  return null;
};

/** Cheap check: does this look like it could be a money movement at all? */
export const looksFinancial = (body) => {
  const text = normalizeWhitespace(body);
  return (extractAmount(text) != null)
    && (findFirstPattern(DEBIT_PATTERNS, text) != null || findFirstPattern(CREDIT_PATTERNS, text) != null);
};

/**
 * Parse one SMS.
 * @param {{ sender: string, body: string, timestamp: number }} sms
 * @returns {{
 *   kind: 'transaction' | 'ignore' | 'unparsed',
 *   reason?: string,
 *   direction?: 'debit' | 'credit',
 *   amount?: number,
 *   account4?: string | null,
 *   accountType?: 'card' | 'account' | null,
 *   refNo?: string | null,
 *   counterparty?: string | null,
 *   isRefund?: boolean,
 *   isCardPayment?: boolean,
 * }}
 */
export const parseSms = ({ sender, body }) => {
  const text = normalizeWhitespace(body);
  CURRENCY_AMOUNT.lastIndex = 0;

  if (!text) return { kind: 'ignore', reason: 'empty' };

  const debitIndex = findFirstPattern(DEBIT_PATTERNS, text);
  const creditIndex = findFirstPattern(CREDIT_PATTERNS, text);
  const hasVerb = debitIndex != null || creditIndex != null;
  const amountInfo = extractAmount(text);

  for (const rule of IGNORE_RULES) {
    if (rule.test.test(text) && !(rule.unless && rule.unless.test(text))) {
      return { kind: 'ignore', reason: rule.reason };
    }
  }

  if (!amountInfo && !hasVerb) return { kind: 'ignore', reason: 'not-financial' };
  if (!hasVerb) return { kind: 'ignore', reason: 'balance-or-info' };
  // A person texting "I paid 500" is not a bank alert
  if (isPhoneNumberSender(sender) && !/\b(?:a\/?c|acct|account|card|upi|bank)\b/i.test(text)) {
    return { kind: 'ignore', reason: 'personal-message' };
  }
  if (!amountInfo) return { kind: 'unparsed', reason: 'no-amount' };

  const isRefund = REFUND_PATTERN.test(text);
  const isCardPayment = CARD_PAYMENT_PATTERN.test(text);

  let direction;
  if (isRefund || isCardPayment) {
    direction = 'credit';
  } else if (debitIndex != null && creditIndex != null) {
    direction = debitIndex <= creditIndex ? 'debit' : 'credit';
  } else {
    direction = debitIndex != null ? 'debit' : 'credit';
  }

  const { account4, accountType } = extractAccount(text);

  return {
    kind: 'transaction',
    direction,
    amount: Math.round(amountInfo.amount * 100) / 100,
    account4,
    accountType,
    refNo: extractReference(text),
    counterparty: extractCounterparty(text),
    isRefund,
    isCardPayment,
  };
};
