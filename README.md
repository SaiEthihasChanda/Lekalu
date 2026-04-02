# Lekalu - Expense Tracker App

A modern React + Vite expense tracking application designed with a trading app-like UI. Track your monthly and yearly expenses with ease.

## 🎯 Key Features

### Authentication ✨ (NEW)
- **Email/Password Registration** - Create secure accounts
- **Login System** - Secure authentication via Firebase
- **Session Persistence** - Stay logged in across sessions
- **User Isolation** - Each user sees only their own data

### Activity Section
- View your daily incoming and outgoing expenses
- Add new activities with amount, type (income/expense), and trackable selection
- See total daily income, expenses, and net flow at a glance
- Remove activities as needed
- Credit card bills are treated as self-transfers and excluded from totals

### Trackables Section
- Create and manage recurring monthly/yearly income and expenses
- Link trackables to specific bank accounts
- Mark trackables to be included in the tracker with predetermined amounts
- Edit and delete existing trackables
- Manage multiple bank accounts with card names and account numbers

### Tracker Section
- Mark recurring trackables as done/incomplete for the current month and year
- Automatically adds activities when trackables are marked as done
- View progress percentage for tracked items
- Select different months and years to track

### Analytics Section
- Comprehensive spending analysis with multiple filters
- Filter by:
  - Time range: Today, This Week, This Month, This Year, or Custom Date Range
  - Bank Account: View analytics for specific accounts
  - Trackable: Focus on specific expense/income categories
- View statistics:
  - Total Income and Expenses
  - Net Flow
  - Expense/Income Ratio
  - Breakdown by Category
  - Breakdown by Account

## Technology Stack

- **React 18** - UI framework
- **JavaScript** - With JSDoc for type documentation
- **Tailwind CSS** - Styling
- **Vite** - Build tool and dev server
- **React Router** - Navigation
- **Firebase** - Authentication & Cloud Database (Firestore)
- **date-fns** - Date utilities
- **Lucide React** - Icons
- **Recharts** - Charts and visualizations

## Data Storage

All data is stored in **Firebase Firestore** (cloud database). This means:
- Your data syncs across all devices
- Real-time updates when data changes
- Automatic backups by Firebase
- Secure authentication with email/password
- User data isolation - each user sees only their own data

## Deployment

The app is automatically deployed to **Firebase Hosting**:
- **URL:** https://lekalu.web.app
- **CI/CD:** GitHub Actions deploys on every push to main branch
- **Updates:** Changes go live within 2-3 minutes
- **Hosting Cost:** Free (with usage limits)

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will start at `http://localhost:5176`

### Setup

1. **Firebase Setup** - Follow [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
2. **GitHub & Deployment** - Follow [GITHUB_FIREBASE_SETUP.md](GITHUB_FIREBASE_SETUP.md)
3. **Local Testing** - Create account and test at http://localhost:5176

### Building

```bash
npm run build
```

Builds the application to the `dist` folder for production.

## Project Structure

```
src/
├── components/          # Reusable React components
│   ├── ActivityCard.jsx
│   ├── AddActivityForm.jsx
│   ├── SourceForm.jsx
│   ├── SourceCard.jsx
│   ├── Modal.jsx
│   ├── Sidebar.jsx
│   └── TrackableForm.jsx
├── contexts/            # React Context for state management
│   └── AuthContext.jsx  # Authentication state
├── fb/                  # Firebase configuration & helpers
│   └── index.js
├── hooks/               # Custom React hooks for data management
│   └── index.js
├── pages/               # Page components
│   ├── ActivityPage.jsx
│   ├── AnalyticsPage.jsx
│   ├── LoginPage.jsx    # NEW: Login page
│   ├── RegisterPage.jsx # NEW: Registration page
│   ├── TrackablesPage.jsx
│   └── TrackerPage.jsx
├── utils/               # Utility functions
│   └── analytics.js
├── App.jsx              # Main app component
├── main.jsx             # Entry point
└── index.css            # Global styles

.github/
└── workflows/
    └── deploy.yml       # GitHub Actions CI/CD

Config Files:
├── firebase.json        # Firebase Hosting config
├── .firebaserc          # Firebase project config
├── .env.local           # Firebase credentials (NOT committed)
├── .env.example         # Example environment variables
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS config
├── postcss.config.js    # PostCSS config
└── package.json
```

## Usage Guide

### First Time Setup
1. Register a new account with your email
2. Login with your credentials
3. Create a bank account in "Trackables" section
4. Define recurring expenses as "Trackables"
5. Start adding daily activities

### Adding an Activity
1. Navigate to the "Activity" section (default)
2. Click "+ Add Activity"
3. Select the type (Income, Expense, or Transfer)
4. Enter the amount
5. Select a bank account (auto-populated if you select a trackable)
6. Optionally select a trackable
7. Add a description
8. Click "Add Activity"

### Creating Trackables
1. Go to "Trackables" section
2. Click "+ Add Trackable"
3. Enter a name (e.g., "Netflix Subscription")
4. Select a linked bank account
5. Choose type (Income or Expense)
6. If you want to track it monthly, toggle "Include in Tracker" and enter the amount
7. Click "Save Trackable"

### Using the Tracker
1. Navigate to the "Tracker" section
2. Select the month and year you want to track
3. Click the circle icon next to each trackable to mark it complete
4. The activity is automatically added when marked complete
5. View your progress percentage

### Analyzing Your Expenses
1. Go to the "Analytics" section
2. Use filters to customize your view:
   - Change time range
   - Filter by specific bank account
   - Filter by specific trackable
3. View summary statistics and breakdowns by category and account

## Security & Privacy

- **Data Encryption**: All data is transmitted over HTTPS and stored securely in Firebase
- **User Isolation**: Each user's data is strictly isolated from other users
- **No Sharing**: Firebase Firestore rules prevent unauthorized access
- **Authentication**: Email/password login with secure Firebase authentication
- **Offline Safe**: Sensitive data (.env.local) is never committed to Git

### Best Practices
- Credit card bills should be treated as self-transfers and won't count in income/expense totals
- Use unique passwords for your account
- Keep your `.env.local` file local (never commit it)
- Enable two-factor authentication on your GitHub account

## Troubleshooting

### Can't login after registering
- Double-check your email and password
- Check that email/password auth is enabled in Firebase Console
- Clear browser cache and try again

### Data not syncing
- Check your internet connection
- Verify Firebase credentials in `.env.local`
- Restart the dev server after changing environment variables

### Deployment failed on GitHub
- Check GitHub Actions logs for detailed error messages
- Verify all 7 GitHub Secrets are added correctly
- Ensure Firebase service account key is valid

## Support

- **Firebase Docs**: https://firebase.google.com/docs
- **React Docs**: https://react.dev/
- **Vite Docs**: https://vitejs.dev/

## License

MIT
