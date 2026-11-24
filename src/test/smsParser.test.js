import { describe, it, expect } from 'vitest';
import { parseSms, normalizeSender, looksFinancial, isAlertSender } from '../sms/parser.js';

// Anonymized samples modelled on real alert templates from Indian banks, cards and UPI apps.
// Names, digits and references are fake.
const transactions = [
  {
    name: 'HDFC UPI sent',
    sender: 'VM-HDFCBK-S',
    body: 'Sent Rs.500.00\nFrom HDFC Bank A/C *1234\nTo RAVI KUMAR\nOn 12/05/25\nRef 512345678901\nNot You?\nCall 18002586161/SMS BLOCK UPI to 7308080808',
    expected: { direction: 'debit', amount: 500, account4: '1234', refNo: '512345678901', counterparty: 'RAVI KUMAR' },
  },
  {
    name: 'HDFC debit with VPA',
    sender: 'AD-HDFCBK-S',
    body: 'Rs.7,361.93 debited from A/c XX1489 on 14-05-25 to VPA swiggy.stores@axb (UPI Ref No 513456789012). Not you? Call 18002586161',
    expected: { direction: 'debit', amount: 7361.93, account4: '1489', refNo: '513456789012', counterparty: 'swiggy.stores@axb' },
  },
  {
    name: 'HDFC card spend',
    sender: 'JD-HDFCBK-S',
    body: 'Spent Rs.1,250 On HDFC Bank Card 5678 At BIGBASKET On 2025-05-12:18:22:10.Not You? To Block+Reissue Call 18002586161/SMS BLOCK CC 5678 to 7308080808',
    expected: { direction: 'debit', amount: 1250, account4: '5678', accountType: 'card', counterparty: 'BIGBASKET' },
  },
  {
    name: 'HDFC salary credit',
    sender: 'VM-HDFCBK-S',
    body: 'Update! INR 75,000.00 deposited in HDFC Bank A/c XX1234 on 01-MAY-25 for NEFT Cr-CITI0000001-ACME PVT LTD-SAI-CITIN52025050100001. Avl bal INR 1,02,345.67. Cheque deposits in A/C are subject to clearing',
    expected: { direction: 'credit', amount: 75000, account4: '1234' },
  },
  {
    name: 'SBI UPI debit without currency',
    sender: 'BZ-SBIUPI-S',
    body: 'Dear UPI user A/C X4321 debited by 250.0 on date 12May25 trf to CHAI POINT Refno 513212345678. If not u? call 1800111109. -SBI',
    expected: { direction: 'debit', amount: 250, account4: '4321', refNo: '513212345678', counterparty: 'CHAI POINT' },
  },
  {
    name: 'SBI UPI credit',
    sender: 'VM-SBIUPI-S',
    body: 'Dear SBI UPI User, ur A/cX4321 credited by Rs500 on 12May25 by  (Ref no 513298765432)',
    expected: { direction: 'credit', amount: 500, account4: '4321', refNo: '513298765432' },
  },
  {
    name: 'SBI ATM withdrawal',
    sender: 'AX-SBIINB-S',
    body: 'Dear Customer, Rs.2000 withdrawn at SBI ATM S1BW000123001 from A/cX4321 on 12May25 Transaction Number 1234. Available Balance Rs.10000.If not withdrawn by you, call 1800111109 -SBI',
    expected: { direction: 'debit', amount: 2000, account4: '4321', counterparty: 'ATM cash withdrawal' },
  },
  {
    name: 'ICICI debit with semicolon payee',
    sender: 'VK-ICICIT-S',
    body: 'ICICI Bank Acct XX123 debited for Rs 1,299.00 on 12-May-25; AMAZON PAY credited. UPI:513345678901. Call 18002662 for dispute. SMS BLOCK 123 to 9215676766.',
    expected: { direction: 'debit', amount: 1299, account4: '123', refNo: '513345678901', counterparty: 'AMAZON PAY' },
  },
  {
    name: 'ICICI card spend with avl limit',
    sender: 'AD-ICICIT-S',
    body: 'INR 899.00 spent using ICICI Bank Card XX9876 on 12-May-25 on NETFLIX. Avl Limit: INR 1,45,000.00. If not you, call 1800 2662/SMS BLOCK 9876 to 9215676766',
    expected: { direction: 'debit', amount: 899, account4: '9876', accountType: 'card' },
  },
  {
    name: 'ICICI credit',
    sender: 'VM-ICICIB-S',
    body: 'Dear Customer, Acct XX123 is credited with Rs 12,000.00 on 10-May-25 from RAVI KUMAR. UPI:513311112222-ICICI Bank.',
    expected: { direction: 'credit', amount: 12000, account4: '123', counterparty: 'RAVI KUMAR' },
  },
  {
    name: 'Axis debit',
    sender: 'VM-AXISBK-S',
    body: 'INR 340.00 debited\nA/c no. XX4455\n12-05-25, 13:45:10\nUPI/P2M/513412341234/ZOMATO\nNot you? SMS BLOCKUPI Cust ID to 919951860002\nAxis Bank',
    expected: { direction: 'debit', amount: 340, account4: '4455', refNo: '513412341234' },
  },
  {
    name: 'Axis credit',
    sender: 'JM-AXISBK-S',
    body: 'INR 2,500.00 credited\nA/c no. XX4455\n12-05-25, 09:12:01 IST\nUPI/P2A/513487654321/PRIYA S\n- Axis Bank',
    expected: { direction: 'credit', amount: 2500, account4: '4455', refNo: '513487654321' },
  },
  {
    name: 'Kotak sent',
    sender: 'AD-KOTAKB-S',
    body: 'Sent Rs.150.00 from Kotak Bank AC X7788 to rapido@ybl on 12-05-25.UPI Ref 513499990000. Not you, https://kotak.com/KBANKT/Fraud',
    expected: { direction: 'debit', amount: 150, account4: '7788', refNo: '513499990000', counterparty: 'rapido@ybl' },
  },
  {
    name: 'Kotak received',
    sender: 'VM-KOTAKB-S',
    body: 'Received Rs.1,000.00 in your Kotak Bank AC X7788 from priya@okaxis on 12-05-25.UPI Ref:513411110000.',
    expected: { direction: 'credit', amount: 1000, account4: '7788', counterparty: 'priya@okaxis' },
  },
  {
    name: 'Card refund',
    sender: 'VM-HDFCBK-S',
    body: 'Dear Customer, refund of Rs 1,250.00 from BIGBASKET has been credited to your HDFC Bank Credit Card ending 5678 on 15-05-25.',
    expected: { direction: 'credit', amount: 1250, account4: '5678', isRefund: true },
  },
  {
    name: 'Reversal for failed transaction is a credit',
    sender: 'VM-SBIUPI-S',
    body: 'Dear SBI User, Rs 500.00 reversed to your A/c X4321 for failed UPI txn Ref 513200001111 on 12May25.',
    expected: { direction: 'credit', amount: 500, account4: '4321', isRefund: true },
  },
  {
    name: 'Credit card bill payment received',
    sender: 'AD-ICICIT-S',
    body: 'Dear Customer, Payment of INR 15,000.00 has been received towards your ICICI Bank Credit Card XX9876 on 05-May-25. Thank you.',
    expected: { direction: 'credit', amount: 15000, account4: '9876', isCardPayment: true },
  },
  {
    name: 'Rupee symbol and lowercase rs',
    sender: 'VK-IDFCFB-S',
    body: '₹ 49.00 debited from your IDFC FIRST Bank a/c ending 3030 for UPI txn to blinkit@hdfcbank on 12/05/2025. RRN 513477778888',
    expected: { direction: 'debit', amount: 49, account4: '3030', refNo: '513477778888', counterparty: 'blinkit@hdfcbank' },
  },
  {
    name: 'INR without space and /- suffix',
    sender: 'BP-BOBTXN-S',
    body: 'Rs.2500/- debited from A/c ...6789 on 12-05-2025 by UPI Ref 513466667777. Avl Bal:Rs.8,210.50-Bank of Baroda',
    expected: { direction: 'debit', amount: 2500, account4: '6789' },
  },
  {
    name: 'Cashback credited',
    sender: 'VM-AXISBK-S',
    body: 'Cashback of Rs 50 has been credited to your Axis Bank Card XX2222 against your transaction at MYNTRA.',
    expected: { direction: 'credit', amount: 50, account4: '2222' },
  },
  {
    name: 'PNB credit with avl bal first in text after',
    sender: 'AD-PNBSMS-S',
    body: 'Your A/c XX0987 credited INR 3,000.00 on 12-05-2025 through UPI ref 513455556666. Aval Bal INR 9,999.00 CR -PNB',
    expected: { direction: 'credit', amount: 3000, account4: '0987' },
  },
];

const ignored = [
  { reason: 'otp', body: '123456 is your OTP for txn of Rs 2,499.00 at AMAZON on HDFC Bank Card 5678. OTP valid for 5 mins. Do not share it with anyone.' },
  { reason: 'future-notice', body: 'Dear Customer, Rs 499.00 will be debited from your A/c XX1234 on 14-05-25 towards NETFLIX mandate. To cancel visit mandate hub.' },
  { reason: 'future-notice', body: 'Pre-debit notification: INR 199.00 for SPOTIFY will be auto-debited from Card XX9876 on 20-May-25.' },
  { reason: 'reminder', body: 'Your Credit Card XX9876 bill of Rs 15,000 is due on 20-May-25. Pay now to avoid late fee.' },
  { reason: 'statement', body: 'Statement for ICICI Bank Credit Card XX9876: Total Amount Due INR 15,000.00, Minimum Amount Due INR 750.00. Due Date 20-May-25.' },
  { reason: 'failed', body: 'Your UPI transaction of Rs 500 to RAVI KUMAR from A/c XX1234 has failed. Amount if debited will be reversed.' },
  { reason: 'failed', body: 'Txn of Rs.1200 on HDFC Bank Card 5678 at AMAZON declined due to insufficient balance.' },
  { reason: 'collect-request', body: 'RAVI KUMAR has requested money of Rs 250 from you on Google Pay. Approve via UPI app. UPI Ref 513400000000.' },
  { reason: 'promotion', body: 'Congratulations! You are eligible for a pre-approved personal loan of Rs 5,00,000. Apply now: https://bank.example/xyz T&C apply' },
  { reason: 'balance-or-info', body: 'Available balance in your A/c XX1234 is Rs 12,345.67 as on 12-05-25.' },
  { reason: 'not-financial', body: 'Your parcel will arrive today. Track at https://example.com' },
];

describe('parseSms transactions', () => {
  transactions.forEach(({ name, sender, body, expected }) => {
    it(name, () => {
      const result = parseSms({ sender, body, timestamp: 0 });
      expect(result.kind).toBe('transaction');
      expect(result).toMatchObject(expected);
    });
  });
});

describe('parseSms ignored messages', () => {
  ignored.forEach(({ reason, body }) => {
    it(`${reason}: ${body.slice(0, 40)}`, () => {
      const result = parseSms({ sender: 'VM-HDFCBK-S', body, timestamp: 0 });
      expect(result.kind).toBe('ignore');
      expect(result.reason).toBe(reason);
    });
  });

  it('only reads alerts from service (-S) and transactional (-T) senders', () => {
    const body = 'Rs 500 debited from A/c XX1234 on 12-05-25';
    ['AD-HDFCBK-S', 'jd-hdfcbk-t'].forEach((sender) => {
      expect(parseSms({ sender, body, timestamp: 0 }).kind).toBe('transaction');
    });
    ['AD-HDFCBK-P', 'VM-GOVTIN-G', 'VM-HDFCBK', 'HDFCBK', '+919876543210', '', undefined].forEach((sender) => {
      expect(parseSms({ sender, body, timestamp: 0 })).toMatchObject({ kind: 'ignore', reason: 'sender-category' });
    });
  });
});

describe('isAlertSender', () => {
  it('needs a header followed by an S or T category', () => {
    expect(isAlertSender('AX-SBIUPI-S')).toBe(true);
    expect(isAlertSender('SBIUPI-T')).toBe(true);
    expect(isAlertSender('VM-S')).toBe(false);
    expect(isAlertSender('AD-HDFCBK-SS')).toBe(false);
  });
});

describe('normalizeSender', () => {
  it('drops operator prefixes and category suffixes', () => {
    expect(normalizeSender('VM-HDFCBK')).toBe('HDFCBK');
    expect(normalizeSender('ad-hdfcbk-s')).toBe('HDFCBK');
    expect(normalizeSender('HDFCBK')).toBe('HDFCBK');
    expect(normalizeSender('+919876543210')).toBe('+919876543210');
  });
});

describe('looksFinancial', () => {
  it('flags money movements only', () => {
    expect(looksFinancial('Rs 500 debited from A/c XX1234')).toBe(true);
    expect(looksFinancial('Meeting at 5pm')).toBe(false);
    expect(looksFinancial('Rs 500 cashback offer')).toBe(false);
  });
});
