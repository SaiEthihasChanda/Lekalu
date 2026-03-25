# Lekalu - Quick Start Guide

## 🚀 Getting Started

Your expense tracking app is now ready! Here's how to use it:

### 1. The App is Currently Running
- Open your browser to **http://localhost:5173**
- You should see the Lekalu expense tracker with a dark theme

### 2. First Steps

#### Add a Bank Account
1. Click on **"Trackables"** in the sidebar
2. Click on the **"Bank Accounts"** tab
3. Click **"+ Add Bank Account"**
4. Enter a card name (e.g., "Chase Credit Card") and account number (e.g., "****1234")
5. Click **"Save Account"**

#### Create a Trackable (Recurring Expense)
1. Stay in **"Trackables"** section, **"Trackables"** tab
2. Click **"+ Add Trackable"**
3. Enter a name (e.g., "Netflix", "Gym Membership")
4. Select your bank account
5. Choose type (Income or Expense)
6. Toggle "Include in Tracker" if you want to track it monthly
7. If tracked, enter the recurring amount
8. Click **"Save Trackable"**

#### Log Your First Activity
1. Go to **"Activity"** (first sidebar item)
2. Click **"+ Add Activity"**
3. Select type: Income, Expense, or Transfer
4. Enter amount
5. Select your bank account
6. Select a trackable (optional)
7. Add description
8. Click **"Add Activity"**
9. See your activity appear as a card with the daily totals updating in real-time

#### Use the Tracker
1. Go to **"Tracker"** section
2. Select month and year
3. Click the empty circle next to each trackable to mark it complete
4. When marked complete, an activity is automatically created
5. Track your progress with the percentage indicator

#### View Analytics
1. Go to **"Analytics"** section
2. Adjust time period (Today, Week, Month, Year, Custom Range)
3. Filter by bank account to see account-specific analytics
4. Filter by trackable to see category-specific analytics
5. View breakdowns by category and account

### 3. Key Features

✅ **Real-time updates** - Your data updates instantly as you add items
✅ **Local storage** - All data stays on your device, no cloud sync needed
✅ **Multiple accounts** - Track expenses across multiple cards
✅ **Smart categorization** - Use trackables to organize spending
✅ **Comprehensive analytics** - Detailed insights with flexible filters
✅ **Trading app UI** - Modern, professional look inspired by financial apps

### 4. Tips

- Use "Transfer" type for credit card payments to yourself - they won't count as income/expense
- Create trackables for all your regular expenses to enable the Tracker feature
- Use analytics filters to understand your spending patterns
- Export/backup your data by accessing your browser's IndexedDB if needed
- The app works offline - all data is stored locally

### 5. Keyboard Shortcuts & Navigation

- **Sidebar links** - Click any section to navigate
- **Modal close** - Click X button or click outside the modal
- **Type selection** - Use the Income/Expense/Transfer buttons
- **Filters** - Use dropdowns in Analytics for easy filtering

## 📱 Data Organization

Your expense tracking data is organized as:

```
Bank Accounts → Each bank account you own
    ↓
Trackables → Recurring expenses linked to accounts
    ↓
Activities → Individual transactions
    ↓
Trackers → Monthly completion status
```

## 🔒 Privacy & Data

- **100% Private** - All data stored locally in your browser
- **No server** - Nothing is sent to external services
- **Persistent** - Data survives browser restarts
- **No login required** - Access anytime without authentication

## ❓ FAQ

**Q: Where is my data stored?**
A: In your browser's IndexedDB, completely offline and private.

**Q: Can I transfer data between devices?**
A: Currently, data is stored per-browser. You would need to export from IndexedDB and import to another device manually.

**Q: What if I close the browser?**
A: Your data persists! IndexedDB keeps your data even after closing the browser.

**Q: How do I back up my data?**
A: Your browser automatically backs up IndexedDB data. For manual backup, you can use browser developer tools to export the database.

**Q: What's the difference between Activity and Tracker?**
A: Activities are individual transactions you log. Trackers are for marking recurring expenses as "done" each month - they automatically create an activity for you.

## 🛠️ Development

The project is built with:
- `npm run dev` for development
- `npm run build` for production builds
- `npm run preview` to preview production build locally

All source files are in `src/` directory with organized structure for easy maintenance.

---

**Enjoy using Lekalu! Happy expense tracking!** 💰
