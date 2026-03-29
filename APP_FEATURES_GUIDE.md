# Lekalu - Expense Tracker App Guide

## 📱 App Overview

**Lekalu** is a modern personal expense tracking application with a trading app-like interface. It helps you track daily income, expenses, and recurring transactions with real-time cloud synchronization, end-to-end encryption, and advanced analytics.

**Key Highlights:**
- 🔐 **Zero-Knowledge Backend**: All data encrypted before cloud storage
- ☁️ **Cloud Sync**: Real-time Firestore synchronization across devices
- 👥 **Group Sharing**: Share expense tracking with family/friends
- 📊 **Advanced Analytics**: Smart filtering and visualizations
- 💳 **Multi-Account**: Manage multiple bank accounts/cards
- 🔄 **Smart Tracker**: Auto-create activities from recurring expenses
- 📱 **Mobile Responsive**: Works seamlessly on all devices

---

## 🚀 Getting Started

### 1. **Create an Account**

![Register Screen]

**Steps:**
1. Go to the app homepage
2. Click **"Create Account"** or **"Sign Up"**
3. Enter your email address
4. Create a strong password (min 8 characters recommended)
5. Click **"Register"**
6. You'll be logged in automatically

**Security Tips:**
- Use a unique password (not reused from other apps)
- Email verification may be required
- Your password is never stored in plain text

### 2. **Login**

**Steps:**
1. Click **"Login"** on the homepage
2. Enter your email and password
3. Click **"Sign In"**
4. You're now in your dashboard!

---

## 📊 Dashboard - Activity Page

The **Activity Page** is your main dashboard showing today's transactions.

### **Main Elements**

```
┌─────────────────────────────────────┐
│  Lekalu Logo          [Logout] [👤] │
├─────────────────────────────────────┤
│  Activity              ← You are here
│  Trackables
│  Tracker
│  Analytics
├─────────────────────────────────────┤
│  Today's Summary                    │
│  Income:    ₹0                      │
│  Expense:   ₹0                      │
│  Balance:   ₹0                      │
├─────────────────────────────────────┤
│  [Add Activity Form]                │
│  Recent Activities List             │
└─────────────────────────────────────┘
```

### **Add an Activity**

**Purpose:** Record daily transactions (income, expenses, or transfers)

**Steps:**
1. Under "Add Activity" form, select transaction type:
   - **Income**: Money received
   - **Expense**: Money spent
   - **Transfer**: Money moved between accounts (not counted in totals)

2. Enter amount (₹)
3. (Optional) Select a **Trackable** - links to recurring expenses
4. (Optional) Select an **Account** - which account/card used
5. (Optional) Add description/notes
6. Click **"Add Activity"**

**Amount Validation:**
- If amount > ₹99,00,000 (99 lakhs), a confirmation modal appears
- Shows amount in Indian words (e.g., "ninety nine lakh")
- Double-check before confirming

**Example:**
- Type: Expense
- Amount: ₹5,000
- Trackable: Netflix Subscription
- Account: HDFC Credit Card
- Description: Monthly subscription

### **View Your Activities**

**Activity Card Layout:**
```
Line 1: [Netflix]                [₹5,000] [2:30 PM]
Line 2: [HDFC Credit Card]      [Edit] [Delete] [Expand]
```

**Actions:**
- **Expand**: Click activity to see full details (description, creator)
- **Edit**: Click edit icon to modify
- **Delete**: Click trash icon to remove

---

## 💳 Trackables Page

**Trackables** are templates for recurring transactions (subscriptions, utilities, rent, etc.)

### **Create a Trackable**

**Steps:**
1. Go to **Trackables** page
2. Click **"Add Trackable"** button
3. Fill in form:
   - **Name** *: e.g., "Netflix Subscription"
   - **Type**: Income or Expense
   - **Account** (optional): Default account for this trackable
   - **Include in Tracker**: Toggle ON to track monthly
   - **Tracker Amount**: Monthly/yearly amount if tracked

4. Click **"Save Trackable"**

**Amount Validation:**
- If tracker amount > ₹99 lakhs, confirm with amount in words

**Example Trackables:**
```
1. Netflix Subscription
   - Type: Expense
   - Amount: ₹499/month
   - Include in Tracker: Yes

2. Salary
   - Type: Income
   - Amount: ₹50,000/month
   - Include in Tracker: Yes

3. Electricity Bill
   - Type: Expense
   - Amount: ₹2,000/month
   - Include in Tracker: Yes
```

### **Manage Bank Accounts**

Each trackable can be linked to a bank account for better organization.

**Add Bank Account:**
1. In Trackables page, find "Bank Accounts" section
2. Click **"Add Account"**
3. Fill in:
   - **Card Name**: e.g., "HDFC Credit Card"
   - **Account Number**: e.g., "****1234"
   - **Opening Balance** (optional): Current balance

4. Click **"Save Account"**

**Amount Validation:**
- If opening balance > ₹99 lakhs, confirm with amount in words

**Edit/Delete:**
- Click edit icon to modify account details
- Click trash to delete account

---

## 📅 Tracker Page

The **Tracker** helps you monitor your yearly/monthly recurring expenses.

### **How It Works**

1. All trackables with **"Include in Tracker" enabled** appear here
2. Each month, you see:
   - Trackable name
   - Expected amount
   - Status checkbox
   - Progress bar

### **Mark as Complete**

**Steps:**
1. Go to **Tracker** page
2. Find a recurring expense
3. Click the **checkbox** to mark as complete
4. An **Activity** is automatically created with:
   - Amount from the trackable
   - Linked to the trackable
   - Current date/time
   - Account from trackable (if set)

**Example:**
```
[✓] Netflix Subscription      ₹499     [████████░] 80%
[✓] Electricity Bill          ₹2,000   [██████░░░] 60%
[ ] Internet Bill             ₹1,000   [░░░░░░░░░] 0%
```

---

## 📊 Analytics Page

Advanced dashboard with spending insights and visualizations.

### **Filter Options**

1. **Date Range**:
   - Last 7 days
   - Last 30 days
   - Last 3 months
   - Last year
   - Custom range

2. **User Filter** (Groups Only):
   - Shows all members in your group
   - Filter spending by individual member
   - Only visible when you're in a group
   - Default: "All Users" shows combined group analytics

3. **Account Filter**:
   - View by specific bank account
   - All accounts combined

4. **Trackable Filter**:
   - View specific expense categories
   - All trackables

### **Visualizations**

**Pie Charts:**
- Expense breakdown by category
- Shows percentage and amount

**Bar Charts:**
- Income vs Expense trends
- Monthly comparison

**Line Graphs:**
- Spending over time
- Trend analysis

### **Summary Stats**
```
Total Income:     ₹50,000
Total Expense:    ₹15,000
Net Balance:      ₹35,000
Transactions:     47
Top Category:     Netflix (5 times)
```

**Example Usage:**
- Filter: Last 30 days
- Account: All
- Trackable: Expenses
- View spending patterns and optimize budget

---

## 👥 Group Features (Coming Soon / If Enabled)

### **Create or Join a Group**

**Purpose:** Share expense tracking with family or friends

**Create Group:**
1. In sidebar, click **"Create Group"**
2. Enter group name
3. Set privacy level
4. Click **"Create"**

**Join Group:**
1. Get group code from group owner
2. Click **"Join Group"**
3. Enter code
4. Click **"Join"**

### **Group Benefits**
- ✅ All members see same data
- ✅ Real-time collaboration
- ✅ Shared analytics
- ✅ Individual accounts still encrypted

### **Leave or Delete Group**
- Click **"Settings"** → **"Leave Group"**
- Your personal data stays with you
- Owner can delete entire group

---

## 🔐 Security & Privacy

### **End-to-End Encryption**

**How It Works:**
- All sensitive data encrypted with AES-256 before upload
- Firebase backend cannot access your data
- Only your device can decrypt
- Each group has unique encryption key

**What's Encrypted:**
- Account numbers
- Transaction amounts
- Descriptions
- Personal notes

**What's NOT Encrypted:**
- Email address
- User ID
- Timestamps

### **Your Data**

**Stored in Firebase Cloud:**
- Firestore database: Real-time sync
- Authentication: Email/password

**On Your Device:**
- Encryption key: Generated from your user ID
- Decryption: Automatic and transparent

**Deletion:**
- Leave group: Your data transferred back to personal
- Delete account: All data deleted permanently (contact support)

---

## 💡 Usage Tips & Best Practices

### **1. Organization**

- ✅ Create trackables for all recurring expenses
- ✅ Link trackables to bank accounts
- ✅ Use consistent naming (e.g., "Netflix Monthly")
- ✅ Add descriptions for one-time transactions

### **2. Accuracy**

- ✅ Verify amounts before confirmation modal
- ✅ Review activity list daily
- ✅ Correct mistakes immediately

### **3. Analysis**

- ✅ Check Analytics weekly to spot trends
- ✅ Compare month-over-month spending
- ✅ Identify high-spending categories
- ✅ Set monthly budgets based on analytics

### **4. Account Management**

- ✅ Update account names if cards change
- ✅ Set opening balances accurately
- ✅ Keep account numbers secure (masked: ****1234)

### **5. Group Sharing**

- ✅ Only add trusted members
- ✅ Regularly review group activities
- ✅ Discuss spending goals together

---

## 🎯 Common Workflows

### **Workflow 1: Track Monthly Bills**

```
1. Create Trackables:
   - Electricity: ₹2,000
   - Internet: ₹1,000
   - Netflix: ₹499

2. Go to Tracker page
3. Each month: Check the boxes as you pay
4. Auto-activities created
5. Check Analytics to see total monthly spending
```

### **Workflow 2: Track Personal Expenses**

```
1. Throughout day: Add Activities
2. Amount auto-calculates
3. Link to trackable if recurring
4. End of day: Review activity list
5. Monthly: Check Analytics for insights
```

### **Workflow 3: Family Expense Sharing**

```
1. Create Group for family
2. All members join
3. Each person logs expenses
4. Real-time sync across devices
5. Family can see shared analytics
6. Discuss budget together
```

### **Workflow 4: Budget Planning**

```
1. Go to Analytics
2. Filter: Last 3 months
3. Analyze spending patterns
4. Identify areas to cut
5. Create new trackables for budget goals
6. Monitor in Tracker page
```

---

## ⚙️ Settings & Account

### **User Profile**
- Email address (cannot change, used for login)
- Logout button

### **Data Management**
- Export data (if available)
- Delete account (permanent)
- Privacy policy

### **App Preferences**
- Dark theme (enabled by default)
- Currency: ₹ (Indian Rupees)
- Language: English

---

## ❓ Frequently Asked Questions

### **Q: Can I undo a transaction?**
A: No, but you can delete it from the action menu. Just click the trash icon on the activity card.

### **Q: Can I change my password?**
A: Currently, use Firebase "Forgot Password" flow. Future updates will add password change feature.

### **Q: How are group expenses split?**
A: All members log separately. Use Analytics to see who spent what.

### **Q: Can I export my data?**
A: Feature in development. For now, screenshots of Analytics page.

### **Q: What happens if I delete the app?**
A: Your data is still in Firebase cloud. Login again to recover it.

### **Q: Is my data backed up?**
A: Yes! Firebase automatically backs up your encrypted data.

### **Q: Can someone hack my account?**
A: Your password is secured by Firebase. Even if hacked, data is encrypted (AES-256).

### **Q: How do I share with family?**
A: Use Groups feature. Create group → share code → members join.

### **Q: What's the limit on trackables/accounts?**
A: Technically unlimited. Practical: 100+ tested fine.

---

## 🐛 Troubleshooting

### **Issue: Activities not syncing across devices**

**Solution:**
1. Check internet connection
2. Logout and login again
3. Force refresh in browser (Ctrl+Shift+R)
4. Clear cache if persists

### **Issue: Cannot add activity (stuck form)**

**Solution:**
1. Refresh page
2. Check amount is valid number
3. Logout → Login again

### **Issue: Group data not visible**

**Solution:**
1. Check you're in the correct group
2. Verify group members number
3. Refresh page
4. Leave → rejoin group

### **Issue: Losing data when leaving group**

**Solution:**
- Don't worry! Data transfers to your personal account
- All activities stay with you
- Check Personal Activities after leaving

### **Issue: "Amount too large" validation**

**Solution:**
- Normal! Amounts > ₹99 lakhs require confirmation
- Modal shows amount in words
- Verify and click "Yes" to confirm

---

## 📞 Support & Feedback

**For Issues:**
- Email: support@lekalu.app (when available)
- GitHub Issues: [link to repo]

**Feature Requests:**
- Suggest on feedback form (coming soon)

**Report Bugs:**
- Include screenshot
- Describe steps to reproduce
- Share error messages

---

## 🎓 Video Tutorials (Coming Soon)

- Introduction to Lekalu
- Creating your first trackable
- Using the Tracker
- Analytics deep dive
- Group expense sharing
- Security & privacy explained

---

## 📋 Glossary

| Term | Definition |
|------|-----------|
| **Activity** | Single transaction (income, expense, or transfer) |
| **Trackable** | Recurring transaction template |
| **Tracker** | Monthly/yearly check-in for trackables |
| **Bank Account** | Linked card/account for transactions |
| **Group** | Shared expense tracking with others |
| **Analytics** | Dashboard with spending insights |
| **Encryption Key** | Unique key to decrypt your data |
| **Paise** | 1/100th of a rupee |
| **Lakh** | 100,000 (Indian numbering) |
| **Crore** | 10,000,000 (Indian numbering) |

---

## 📈 Version Info

**Current Version:** 1.0.0

**Last Updated:** March 2026

**Built With:**
- React 18 + Vite
- Firebase (Firestore + Auth)
- Tailwind CSS
- Recharts (Analytics)
- AES-256 Encryption

---

## 📄 License & Terms

- [Privacy Policy](privacy.md)
- [Terms of Service](terms.md)
- [Security Policy](security.md)

---

**Happy Tracking! 📊💰**

*Lekalu - Your Personal Finance Companion*
